// Publica los tickets en el canal de Slack del equipo y sigue cada uno en su hilo.
//   ticket_nuevo      → mensaje en el canal con escuela, contacto, asunto y link al backoffice.
//   ticket_respuesta  → respuesta del equipo en el hilo del ticket.
//   ticket_estado     → cambio de estado en el hilo (resuelto, reabierto, en curso).
// La llaman los triggers de la base con pg_net (migración 20261111150000_slack_tickets.sql) y el header
// x-trigger-secret. Se despliega con --no-verify-jwt: pg_net no manda la sesión de Supabase.
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { admin, CORS, env, json, secretoValido } from '../_shared/comun.ts';

const MAX_CITA = 500;

interface Evento {
  evento: 'ticket_nuevo' | 'ticket_respuesta' | 'ticket_estado';
  ticket_id: string;
  mensaje_id?: string;
  estado?: string;
}

interface TicketSlack {
  id: string;
  asunto: string;
  mensaje: string;
  estado: string;
  slack_ts: string | null;
  escuelas: { nombre: string } | null;
  contactos: { nombre: string; cargo: string | null } | null;
  equipo: { nombre: string } | null;
}

async function slack<T>(metodo: string, cuerpo: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://slack.com/api/${metodo}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('SLACK_BOT_TOKEN')}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(cuerpo),
  });
  const r = await res.json();
  if (!r.ok) throw new Error(`Slack ${metodo}: ${r.error ?? res.status}`);
  return r as T;
}

async function permalink(canal: string, ts: string): Promise<string | null> {
  const url = new URL('https://slack.com/api/chat.getPermalink');
  url.search = new URLSearchParams({ channel: canal, message_ts: ts }).toString();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${env('SLACK_BOT_TOKEN')}` } });
  const r = await res.json();
  return r.ok ? r.permalink : null;
}

// El texto viene de clientes y del equipo: se escapa para que `<!channel>` o un link armado no se interpreten.
const escapar = (texto: string) => texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function cita(texto: string): string {
  const corto = texto.length > MAX_CITA ? `${texto.slice(0, MAX_CITA).trimEnd()}…` : texto;
  return escapar(corto)
    .split('\n')
    .map((linea) => `>${linea}`)
    .join('\n');
}

function textoTicket(t: TicketSlack): string {
  const link = `${env('APP_URL')}/tickets?ticket=${encodeURIComponent(t.id)}`;
  const contacto = t.contactos ? `${t.contactos.nombre}${t.contactos.cargo ? ` (${t.contactos.cargo})` : ''}` : 'Contacto desconocido';
  return [
    `:ticket: *Ticket nuevo* de *${escapar(t.escuelas?.nombre ?? 'Escuela desconocida')}*`,
    `*<${link}|${escapar(t.asunto)}>*`,
    `${escapar(contacto)} · Owner: ${escapar(t.equipo?.nombre ?? 'sin owner')}`,
    cita(t.mensaje),
  ].join('\n');
}

/** Publica el mensaje raíz del ticket (si todavía no existe) y devuelve su ts. */
async function hiloDe(db: SupabaseClient, t: TicketSlack): Promise<string> {
  if (t.slack_ts) return t.slack_ts;
  const canal = env('SLACK_CANAL_TICKETS');
  const { ts } = await slack<{ ts: string }>('chat.postMessage', { channel: canal, text: textoTicket(t), unfurl_links: false, unfurl_media: false });
  const url = await permalink(canal, ts).catch(() => null);
  // Solo si nadie lo publicó en paralelo; si no, queda el primero.
  await db.from('tickets').update({ slack_ts: ts, slack_url: url }).eq('id', t.id).is('slack_ts', null);
  return ts;
}

async function enHilo(ts: string, texto: string): Promise<void> {
  await slack('chat.postMessage', { channel: env('SLACK_CANAL_TICKETS'), thread_ts: ts, text: texto, unfurl_links: false, unfurl_media: false });
}

const TEXTO_ESTADO: Record<string, string> = {
  // "En curso" no se avisa: casi siempre viene junto con una respuesta, que ya se publica.
  Resuelto: ':white_check_mark: Ticket *resuelto*.',
  Nuevo: ':arrows_counterclockwise: Ticket *reabierto*.',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  if (!secretoValido(req.headers.get('x-trigger-secret'), env('SLACK_TRIGGER_SECRET'))) return json({ error: 'No autorizado' }, 401);

  let evento: Evento;
  try {
    evento = await req.json();
  } catch {
    return json({ error: 'El cuerpo no es JSON' }, 400);
  }

  const db = admin();
  const { data: ticket } = await db
    .from('tickets')
    .select('id, asunto, mensaje, estado, slack_ts, escuelas(nombre), contactos(nombre, cargo), equipo(nombre)')
    .eq('id', evento.ticket_id)
    .maybeSingle<TicketSlack>();
  if (!ticket || ticket.slack_ts === 'demo') return json({ ok: true, ignorado: true });

  try {
    const ts = await hiloDe(db, ticket);
    if (evento.evento === 'ticket_respuesta' && evento.mensaje_id) {
      const { data: m } = await db.from('ticket_mensajes').select('autor, cuerpo').eq('id', evento.mensaje_id).maybeSingle();
      if (m) await enHilo(ts, `:leftwards_arrow_with_hook: *${escapar(m.autor)}* respondió:\n${cita(m.cuerpo)}`);
    } else if (evento.evento === 'ticket_estado') {
      const texto = TEXTO_ESTADO[evento.estado ?? ticket.estado];
      if (texto) await enHilo(ts, texto);
    }
    return json({ ok: true });
  } catch (e) {
    console.error(evento.ticket_id, e);
    return json({ error: 'No se pudo publicar en Slack' }, 500);
  }
});
