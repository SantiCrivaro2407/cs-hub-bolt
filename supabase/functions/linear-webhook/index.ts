// Webhook de Linear (recurso Issue): cada alta, cambio o baja en Linear se refleja en el hub al instante.
// Linear firma el cuerpo con HMAC-SHA256 (header linear-signature) usando LINEAR_WEBHOOK_SECRET.
// No se confía en el contenido del payload: se vuelve a leer la issue desde la API y se guarda con el mismo
// código que la sync, así hay un único camino de escritura.
import { admin, env, json, secretoValido } from '../_shared/comun.ts';
import { borrarDesdeLinear, guardarDesdeLinear, issuePorId } from '../_shared/linear.ts';

const VENTANA_MS = 5 * 60 * 1000;

async function firma(secreto: string, cuerpo: string): Promise<string> {
  const clave = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(cuerpo)));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  const cuerpo = await req.text();
  if (!secretoValido(req.headers.get('linear-signature'), await firma(env('LINEAR_WEBHOOK_SECRET'), cuerpo))) {
    return json({ error: 'Firma inválida' }, 401);
  }

  let evento: { type?: string; action?: string; webhookTimestamp?: number; data?: { id?: string } };
  try {
    evento = JSON.parse(cuerpo);
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }
  // Evita que se reenvíe un evento viejo capturado.
  if (!evento.webhookTimestamp || Math.abs(Date.now() - evento.webhookTimestamp) > VENTANA_MS) {
    return json({ error: 'Evento vencido' }, 401);
  }
  const id = evento.data?.id;
  if (evento.type !== 'Issue' || !id) return json({ ignorado: true });

  const db = admin();
  try {
    if (evento.action === 'remove') {
      await borrarDesdeLinear(db, id);
      return json({ borrada: id });
    }
    const issue = await issuePorId(id);
    if (!issue) {
      await borrarDesdeLinear(db, id);
      return json({ borrada: id });
    }
    const r = await guardarDesdeLinear(db, [issue]);
    return json(r);
  } catch (e) {
    console.error(e);
    // 500 hace que Linear reintente.
    return json({ error: 'No se pudo procesar el evento' }, 500);
  }
});
