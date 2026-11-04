// Trae de Gmail los emails intercambiados con contactos del backoffice y los registra como interacciones.
//   POST con la sesión del backoffice        → sincroniza el Gmail de quien llama ("Sincronizar ahora").
//   POST con header x-cron-secret correcto   → sincroniza el Gmail de todo el equipo (pg_cron).
// Solo entran mensajes donde algún email de `contactos` aparece en From, To o Cc.
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import {
  admin,
  cargarWhitelist,
  CORS,
  env,
  escuelasDe,
  extraerEmails,
  guardarInteracciones,
  json,
  miembroDesdeRequest,
  type ContactoWhitelist,
  type FilaInteraccion,
} from '../_shared/comun.ts';
import { accessTokenDesdeRefresh, ErrorGoogle, gmail } from '../_shared/google.ts';

const DIAS_PRIMERA_SYNC = 30;
const EMAILS_POR_CONSULTA = 20; // cada email suma 3 términos (from/to/cc) a la búsqueda de Gmail
const MAX_MENSAJES_POR_CONSULTA = 500;
const MAX_CUERPO = 50_000;

interface Integracion {
  id: string;
  equipo_id: string;
  cuenta: string | null;
  ultima_sync: string | null;
}

interface ParteMensaje {
  mimeType?: string;
  body?: { data?: string };
  parts?: ParteMensaje[];
}

interface MensajeGmail {
  id: string;
  threadId: string;
  internalDate: string;
  payload: ParteMensaje & { headers: { name: string; value: string }[] };
}

function decodificar(data: string): string {
  const normal = data.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(normal), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function buscarParte(parte: ParteMensaje, tipo: string): string | null {
  if (parte.mimeType === tipo && parte.body?.data) return decodificar(parte.body.data);
  for (const hija of parte.parts ?? []) {
    const encontrado = buscarParte(hija, tipo);
    if (encontrado) return encontrado;
  }
  return null;
}

function htmlATexto(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Cuerpo completo del email en texto plano (sin adjuntos). */
function cuerpoDe(mensaje: MensajeGmail): string {
  const texto = buscarParte(mensaje.payload, 'text/plain') ?? htmlATexto(buscarParte(mensaje.payload, 'text/html') ?? '');
  return texto.trim().slice(0, MAX_CUERPO);
}

function nombreRemitente(from: string): string {
  const nombre = from.replace(/<[^>]*>/, '').replace(/"/g, '').trim();
  return nombre || extraerEmails(from)[0] || 'Desconocido';
}

function trozos<T>(lista: T[], tamano: number): T[][] {
  return Array.from({ length: Math.ceil(lista.length / tamano) }, (_, i) => lista.slice(i * tamano, (i + 1) * tamano));
}

async function idsDeMensajes(token: string, emails: string[], desde: Date): Promise<string[]> {
  const ids = new Set<string>();
  const despues = Math.floor(desde.getTime() / 1000);
  for (const grupo of trozos(emails, EMAILS_POR_CONSULTA)) {
    const terminos = grupo.flatMap((e) => [`from:${e}`, `to:${e}`, `cc:${e}`]).join(' ');
    let pagina: string | undefined;
    let vistos = 0;
    do {
      const res = await gmail<{ messages?: { id: string }[]; nextPageToken?: string }>(token, 'messages', {
        q: `{${terminos}} after:${despues}`,
        maxResults: '100',
        includeSpamTrash: 'false',
        ...(pagina ? { pageToken: pagina } : {}),
      });
      for (const m of res.messages ?? []) ids.add(m.id);
      vistos += res.messages?.length ?? 0;
      pagina = res.nextPageToken;
    } while (pagina && vistos < MAX_MENSAJES_POR_CONSULTA);
  }
  return [...ids];
}

async function enParalelo<T, R>(items: T[], limite: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const resultados: R[] = [];
  for (const grupo of trozos(items, limite)) resultados.push(...(await Promise.all(grupo.map(fn))));
  return resultados;
}

function filasDeMensaje(mensaje: MensajeGmail, cuenta: string, whitelist: Map<string, ContactoWhitelist[]>): FilaInteraccion[] {
  const header = (nombre: string) => mensaje.payload.headers.find((h) => h.name.toLowerCase() === nombre)?.value ?? '';
  const from = header('from');
  const de = extraerEmails(from)[0] ?? null;
  const para = [...new Set([...extraerEmails(header('to')), ...extraerEmails(header('cc'))])];
  const escuelas = escuelasDe([...(de ? [de] : []), ...para], whitelist);
  if (escuelas.length === 0) return [];

  const enviado = de === cuenta;
  const cuerpo = cuerpoDe(mensaje);
  return escuelas.map((escuelaId) => ({
    escuela_id: escuelaId,
    tipo: enviado ? 'email_enviado' : 'email_recibido',
    titulo: header('subject').trim() || '(sin asunto)',
    autor: nombreRemitente(from),
    fecha: new Date(Number(mensaje.internalDate)).toISOString(),
    cuerpo,
    origen: 'gmail',
    externo_id: mensaje.id,
    de: from || null,
    para,
  }));
}

async function sincronizar(db: SupabaseClient, integracion: Integracion, whitelist: Map<string, ContactoWhitelist[]>) {
  const inicio = new Date();
  const { data: secreto } = await db.from('integracion_secretos').select('refresh_token').eq('integracion_id', integracion.id).maybeSingle();
  if (!secreto) {
    await db.from('integraciones').update({ estado: 'error', ultimo_error: 'Falta reconectar Gmail' }).eq('id', integracion.id);
    return { integracion: integracion.id, error: 'sin_token' };
  }

  try {
    const token = await accessTokenDesdeRefresh(secreto.refresh_token);
    const cuenta = (integracion.cuenta ?? '').toLowerCase();
    // Se vuelve a mirar una hora para atrás por si algún mensaje llegó con demora; los duplicados se descartan.
    const desde = integracion.ultima_sync
      ? new Date(new Date(integracion.ultima_sync).getTime() - 60 * 60 * 1000)
      : new Date(Date.now() - DIAS_PRIMERA_SYNC * 24 * 60 * 60 * 1000);

    const ids = await idsDeMensajes(token, [...whitelist.keys()], desde);
    const mensajes = await enParalelo(ids, 5, (id) => gmail<MensajeGmail>(token, `messages/${id}`, { format: 'full' }));
    const filas = mensajes.flatMap((m) => filasDeMensaje(m, cuenta, whitelist));
    const nuevas = await guardarInteracciones(db, filas);

    await db.from('integraciones').update({ estado: 'conectada', ultima_sync: inicio.toISOString(), ultimo_error: null }).eq('id', integracion.id);
    return { integracion: integracion.id, revisados: ids.length, nuevas };
  } catch (e) {
    const revocado = e instanceof ErrorGoogle && e.codigo === 'invalid_grant';
    const mensaje = revocado ? 'Google revocó el acceso: hay que reconectar Gmail' : String(e instanceof Error ? e.message : e).slice(0, 300);
    console.error(integracion.id, e);
    await db.from('integraciones').update({ estado: 'error', ultimo_error: mensaje }).eq('id', integracion.id);
    return { integracion: integracion.id, error: mensaje };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  const db = admin();

  let consulta = db.from('integraciones').select('id, equipo_id, cuenta, ultima_sync').eq('proveedor', 'gmail').neq('estado', 'desconectada');
  const esCron = req.headers.get('x-cron-secret') === env('CRON_SECRET');
  if (!esCron) {
    const miembro = await miembroDesdeRequest(db, req);
    if (!miembro) return json({ error: 'Tu cuenta no está en el equipo de CS.' }, 401);
    consulta = consulta.eq('equipo_id', miembro.id);
  }

  const { data: integraciones, error } = await consulta;
  if (error) return json({ error: error.message }, 500);
  if (!integraciones?.length) return json({ error: 'No hay ningún Gmail conectado.' }, 404);

  const whitelist = await cargarWhitelist(db);
  if (whitelist.size === 0) return json({ resultados: [], aviso: 'No hay contactos con email cargados.' });

  const resultados = [];
  for (const integracion of integraciones) resultados.push(await sincronizar(db, integracion, whitelist));
  const nuevas = resultados.reduce((acc, r) => acc + ('nuevas' in r ? (r.nuevas ?? 0) : 0), 0);
  return json({ nuevas, resultados });
});
