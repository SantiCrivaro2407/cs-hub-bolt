import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function env(nombre: string): string {
  const valor = Deno.env.get(nombre);
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

/** Cliente con service role: salta RLS. Solo vive en el servidor. */
export function admin(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
}

/** Compara un secreto en tiempo constante (no corta en el primer carácter distinto). */
export function secretoValido(recibido: string | null, esperado: string): boolean {
  if (!recibido) return false;
  const a = new TextEncoder().encode(recibido);
  const b = new TextEncoder().encode(esperado);
  let diferencia = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) diferencia |= (a[i] ?? 0) ^ b[i];
  return diferencia === 0;
}

export function json(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

export interface MiembroEquipo {
  id: string;
  nombre: string;
  email: string;
}

/** Resuelve el miembro del equipo a partir del JWT del usuario logueado en el backoffice. */
export async function miembroDesdeRequest(db: SupabaseClient, req: Request): Promise<MiembroEquipo | null> {
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!jwt) return null;
  const { data } = await db.auth.getUser(jwt);
  const usuario = data.user;
  if (!usuario) return null;
  // Misma regla que RLS (mi_equipo_id): la fila atada a este usuario, o una sin reclamar con su email confirmado.
  // Comparación exacta en código; no usar ilike, donde % _ * del email actuarían como comodines.
  const { data: equipo } = await db.from('equipo').select('id, nombre, email, user_id');
  const filas = equipo ?? [];
  const email = usuario.email?.toLowerCase();
  const miembro =
    filas.find((m) => m.user_id === usuario.id) ??
    (email && usuario.email_confirmed_at ? filas.find((m) => !m.user_id && String(m.email).trim().toLowerCase() === email) : undefined);
  return miembro ? { id: miembro.id, nombre: miembro.nombre, email: miembro.email } : null;
}

/** La URL solo si es https y su host es uno de los esperados (o un subdominio). */
export function urlHttps(valor: string | null | undefined, hosts: string[]): string | null {
  if (!valor) return null;
  try {
    const url = new URL(valor.trim());
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && hosts.some((h) => host === h || host.endsWith(`.${h}`)) ? url.toString() : null;
  } catch {
    return null;
  }
}

const PATRON_EMAIL = /[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;
// Un solo email, sin espacios ni operadores: se usa tal cual en la búsqueda de Gmail.
export const PATRON_EMAIL_EXACTO = /^[a-z0-9._+'-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;

/** Extrae los emails de un header tipo `"Ana" <ana@x.com>, b@y.com`, en minúscula. */
export function extraerEmails(texto: string | null | undefined): string[] {
  return [...new Set((texto ?? '').match(PATRON_EMAIL)?.map((e) => e.toLowerCase()) ?? [])];
}

export interface ContactoWhitelist {
  id: string;
  escuela_id: string;
  nombre: string;
}

const dominioDe = (email: string) => email.split('@')[1] ?? '';
const PATRON_DOMINIO = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;

/** `dominio_staff` admite varios dominios separados por coma (p. ej. una escuela con dos). */
export function dominiosDe(dominioStaff: string | null | undefined): string[] {
  return (dominioStaff ?? '')
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter((d) => PATRON_DOMINIO.test(d));
}

/** Las claves de la whitelist que empiezan con @ son dominios enteros de una escuela. */
export const esDominio = (clave: string) => clave.startsWith('@');

/**
 * La whitelist: email de contacto → contactos (un email puede estar cargado en más de una escuela),
 * y `@dominio` → escuelas, con el dominio de staff de cada escuela: cualquier dirección de ese dominio cuenta.
 * Cualquier miembro puede cargar contactos, así que se descartan las direcciones del propio equipo
 * (sus emails, el dominio de la empresa y los Gmail conectados): si no, cargar como "contacto" el mail
 * de un compañero copiaría toda su casilla a interacciones.
 */
export async function cargarWhitelist(db: SupabaseClient): Promise<Map<string, ContactoWhitelist[]>> {
  const [contactos, equipo, cuentas, escuelas] = await Promise.all([
    db.from('contactos').select('id, escuela_id, nombre, email').not('email', 'is', null),
    db.from('equipo').select('email'),
    db.from('integraciones').select('cuenta').not('cuenta', 'is', null),
    db.from('escuelas').select('id, nombre, dominio_staff'),
  ]);
  const error = contactos.error ?? equipo.error ?? cuentas.error ?? escuelas.error;
  if (error) throw new Error(`No se pudieron leer los contactos: ${error.message}`);
  const emailsEquipo = (equipo.data ?? []).map((m) => String(m.email).trim().toLowerCase());
  const excluidos = new Set([...emailsEquipo, ...(cuentas.data ?? []).map((c) => String(c.cuenta).trim().toLowerCase())]);
  const dominiosEquipo = new Set(emailsEquipo.map(dominioDe).filter(Boolean));

  const mapa = new Map<string, ContactoWhitelist[]>();
  for (const c of contactos.data ?? []) {
    const email = String(c.email).trim().toLowerCase();
    if (!PATRON_EMAIL_EXACTO.test(email) || excluidos.has(email) || dominiosEquipo.has(dominioDe(email))) continue;
    mapa.set(email, [...(mapa.get(email) ?? []), { id: c.id, escuela_id: c.escuela_id, nombre: c.nombre }]);
  }
  for (const e of escuelas.data ?? []) {
    for (const dominio of dominiosDe(e.dominio_staff)) {
      if (dominiosEquipo.has(dominio)) continue;
      const clave = `@${dominio}`;
      mapa.set(clave, [...(mapa.get(clave) ?? []), { id: `dominio:${e.id}`, escuela_id: e.id, nombre: e.nombre }]);
    }
  }
  return mapa;
}

/** Escuelas involucradas según los emails que participan del intercambio. */
export function escuelasDe(emails: string[], whitelist: Map<string, ContactoWhitelist[]>): string[] {
  return [...new Set(emails.flatMap((e) => [...(whitelist.get(e) ?? []), ...(whitelist.get(`@${dominioDe(e)}`) ?? [])]).map((c) => c.escuela_id))];
}

export interface FilaInteraccion {
  escuela_id: string;
  tipo: 'email_recibido' | 'email_enviado' | 'reunion';
  titulo: string;
  autor: string;
  fecha: string;
  cuerpo: string;
  duracion_min?: number | null;
  action_items?: { id: string; texto: string; loop_id: null }[];
  origen: 'gmail' | 'readai';
  externo_id: string;
  de?: string | null;
  para?: string[];
  enlace?: string | null;
  // Conversación a la que pertenece (`gmail:<threadId>`), para mostrar los mensajes agrupados.
  hilo?: string | null;
}

/** Inserta sin duplicar (origen + externo_id + escuela) y actualiza el último contacto de cada escuela. */
export async function guardarInteracciones(db: SupabaseClient, filas: FilaInteraccion[]): Promise<number> {
  if (filas.length === 0) return 0;
  const { data, error } = await db
    .from('interacciones')
    .upsert(filas, { onConflict: 'origen,externo_id,escuela_id', ignoreDuplicates: true })
    .select('id');
  if (error) throw new Error(`No se pudieron guardar las interacciones: ${error.message}`);

  const ultimoPorEscuela = new Map<string, string>();
  for (const f of filas) {
    const previo = ultimoPorEscuela.get(f.escuela_id);
    if (!previo || f.fecha > previo) ultimoPorEscuela.set(f.escuela_id, f.fecha);
  }
  for (const [escuelaId, fecha] of ultimoPorEscuela) {
    await db.from('escuelas').update({ ultimo_contacto: fecha }).eq('id', escuelaId).or(`ultimo_contacto.is.null,ultimo_contacto.lt."${fecha}"`);
  }
  return data?.length ?? 0;
}
