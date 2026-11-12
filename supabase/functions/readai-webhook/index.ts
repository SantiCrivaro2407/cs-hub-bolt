// Recibe el reporte de Read AI al terminar una reunión y lo registra como interacción "reunion".
// URL a cargar en Read AI (Integraciones → Webhooks):  .../functions/v1/readai-webhook?token=<token del miembro>
// El token identifica a quién del equipo pertenece el Read AI (se genera en la pantalla Integraciones).
// Solo se registra si algún participante es un contacto del backoffice; si no, se descarta.
// Se despliega con --no-verify-jwt: Read AI no manda la sesión de Supabase.
import { admin, cargarWhitelist, CORS, escuelasDe, extraerEmails, guardarInteracciones, json, urlHttps, type FilaInteraccion } from '../_shared/comun.ts';

type Valor = unknown;

// El formato del payload puede variar entre versiones de Read AI: se lee de forma tolerante.
function texto(...valores: Valor[]): string {
  for (const v of valores) {
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (v && typeof v === 'object') {
      const o = v as Record<string, Valor>;
      const anidado = texto(o.text, o.content, o.summary, o.title, o.description);
      if (anidado) return anidado;
    }
  }
  return '';
}

function lista(...valores: Valor[]): Valor[] {
  return (valores.find((v) => Array.isArray(v)) as Valor[] | undefined) ?? [];
}

function emailsDeParticipantes(participantes: Valor[]): string[] {
  return [
    ...new Set(
      participantes.flatMap((p) =>
        typeof p === 'string' ? extraerEmails(p) : extraerEmails(texto((p as Record<string, Valor>)?.email, (p as Record<string, Valor>)?.email_address)),
      ),
    ),
  ];
}

function fecha(v: Valor): Date | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const d = new Date(typeof v === 'number' && v < 1e12 ? v * 1000 : v);
  return Number.isNaN(d.getTime()) ? null : d;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  const db = admin();

  const token = new URL(req.url).searchParams.get('token');
  if (!token) return json({ error: 'Falta el token' }, 401);
  const { data: integracion } = await db
    .from('integraciones')
    .select('id, equipo:equipo_id(nombre)')
    .eq('proveedor', 'readai')
    .neq('estado', 'desconectada')
    .eq('config->>token', token)
    .maybeSingle();
  if (!integracion) return json({ error: 'Token inválido' }, 401);

  let p: Record<string, Valor>;
  try {
    p = await req.json();
  } catch {
    return json({ error: 'El cuerpo no es JSON' }, 400);
  }

  const sesion = texto(p.session_id, p.sessionId, p.meeting_id, p.id);
  const participantes = emailsDeParticipantes(lista(p.participants, p.attendees, (p.meeting as Record<string, Valor>)?.participants));
  if (!sesion) return json({ error: 'Falta el id de la sesión' }, 400);

  const whitelist = await cargarWhitelist(db);
  const escuelas = escuelasDe(participantes, whitelist);
  await db.from('integraciones').update({ estado: 'conectada', ultima_sync: new Date().toISOString(), ultimo_error: null }).eq('id', integracion.id);
  // Reunión sin contactos de clientes: no se guarda nada.
  if (escuelas.length === 0) return json({ ok: true, registrada: false });

  const inicio = fecha(p.start_time ?? p.started_at ?? p.startTime) ?? new Date();
  const fin = fecha(p.end_time ?? p.ended_at ?? p.endTime);
  const duracion = fin ? Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / 60000)) : null;
  const actionItems = lista(p.action_items, p.actionItems)
    .map((item) => texto(item))
    .filter(Boolean)
    .map((t) => ({ id: crypto.randomUUID(), texto: t, loop_id: null }));
  const equipo = integracion.equipo as { nombre?: string } | null;

  const filas: FilaInteraccion[] = escuelas.map((escuelaId) => ({
    escuela_id: escuelaId,
    tipo: 'reunion',
    titulo: texto(p.title, p.meeting_title, p.name) || 'Reunión',
    autor: equipo?.nombre ?? 'Read AI',
    fecha: inicio.toISOString(),
    cuerpo: texto(p.summary, p.overview, (p.report as Record<string, Valor>)?.summary),
    duracion_min: duracion,
    action_items: actionItems,
    origen: 'readai',
    externo_id: sesion,
    para: participantes,
    // Solo links https de Read AI: el valor viene del payload y se muestra como link a todo el equipo.
    enlace: urlHttps(texto(p.report_url, p.reportUrl, p.url), ['read.ai']),
  }));

  try {
    const nuevas = await guardarInteracciones(db, filas);
    return json({ ok: true, registrada: true, nuevas });
  } catch (e) {
    console.error(e);
    await db.from('integraciones').update({ estado: 'error', ultimo_error: String(e).slice(0, 300) }).eq('id', integracion.id);
    return json({ error: 'No se pudo guardar' }, 500);
  }
});
