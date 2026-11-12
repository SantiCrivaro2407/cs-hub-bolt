// Envía un email desde el Gmail del miembro que está logueado en el backoffice y lo registra como interacción.
//   POST (con la sesión del backoffice) { escuela_id, para[], asunto, cuerpo, responde_a?, loop_id?, ticket_id? }
// Si `responde_a` es una interacción traída de Gmail, la respuesta va en el mismo hilo (threadId + In-Reply-To).
// Solo se puede escribir a contactos de esa escuela o a direcciones de su dominio de staff.
// Se despliega con --no-verify-jwt y valida la sesión con miembroDesdeRequest, como gmail-sync.
import { admin, CORS, dominiosDe, json, miembroDesdeRequest, PATRON_EMAIL_EXACTO } from '../_shared/comun.ts';
import { accessTokenDesdeRefresh, ErrorGoogle, gmail } from '../_shared/google.ts';

const MAX_CUERPO = 50_000;

interface Pedido {
  escuela_id?: string;
  para?: string[];
  asunto?: string;
  cuerpo?: string;
  responde_a?: string | null;
  loop_id?: string | null;
  ticket_id?: string | null;
}

interface MensajeOriginal {
  id: string;
  threadId: string;
  payload: { headers: { name: string; value: string }[] };
}

// Por partes: con String.fromCharCode(...bytes) un cuerpo largo excede el máximo de argumentos.
function base64Utf8(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}
const base64url = (texto: string) => base64Utf8(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
// Un salto de línea en un header permitiría inyectar otros headers.
const enUnaLinea = (texto: string) => texto.replace(/[\r\n]+/g, ' ').trim();

function armarMime(para: string[], asunto: string, cuerpo: string, enRespuestaA: string | null): string {
  const lineas = [
    `To: ${para.join(', ')}`,
    `Subject: =?UTF-8?B?${base64Utf8(asunto)}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ];
  if (enRespuestaA) lineas.push(`In-Reply-To: ${enRespuestaA}`, `References: ${enRespuestaA}`);
  // base64 del cuerpo en líneas de 76 caracteres, como pide MIME.
  const cuerpo64 = base64Utf8(cuerpo).replace(/.{76}/g, '$&\r\n');
  return `${lineas.join('\r\n')}\r\n\r\n${cuerpo64}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  const db = admin();

  const miembro = await miembroDesdeRequest(db, req);
  if (!miembro) return json({ error: 'Tu cuenta no está en el equipo de CS.' }, 401);

  let p: Pedido;
  try {
    p = await req.json();
  } catch {
    return json({ error: 'El cuerpo no es JSON' }, 400);
  }
  const asunto = enUnaLinea(p.asunto ?? '');
  const cuerpo = (p.cuerpo ?? '').trim().slice(0, MAX_CUERPO);
  const para = [...new Set((p.para ?? []).map((e) => String(e).trim().toLowerCase()))];
  if (!p.escuela_id || !asunto || !cuerpo || para.length === 0) return json({ error: 'Faltan destinatarios, asunto o mensaje.' }, 400);

  const [{ data: escuela }, { data: contactos }, { data: integracion }] = await Promise.all([
    db.from('escuelas').select('id, dominio_staff').eq('id', p.escuela_id).maybeSingle(),
    db.from('contactos').select('email').eq('escuela_id', p.escuela_id).not('email', 'is', null),
    db.from('integraciones').select('id, cuenta, config, estado').eq('equipo_id', miembro.id).eq('proveedor', 'gmail').maybeSingle(),
  ]);
  if (!escuela) return json({ error: 'No existe esa escuela.' }, 404);
  if (!integracion || integracion.estado === 'desconectada') return json({ error: 'Conectá tu Gmail en Integraciones para enviar.' }, 409);
  if (!integracion.config?.envio) return json({ error: 'Reconectá Gmail en Integraciones y aceptá el permiso para enviar emails.' }, 409);

  const permitidos = new Set((contactos ?? []).map((c) => String(c.email).trim().toLowerCase()));
  const dominios = dominiosDe(escuela.dominio_staff);
  const invalido = para.find((e) => !PATRON_EMAIL_EXACTO.test(e) || !(permitidos.has(e) || dominios.some((d) => e.endsWith(`@${d}`))));
  if (invalido) return json({ error: `Solo se puede escribir a contactos o al staff de la escuela (${invalido}).` }, 400);

  const { data: secreto } = await db.from('integracion_secretos').select('refresh_token').eq('integracion_id', integracion.id).maybeSingle();
  if (!secreto) return json({ error: 'Reconectá Gmail en Integraciones.' }, 409);

  try {
    const token = await accessTokenDesdeRefresh(secreto.refresh_token);

    // Si responde a un email traído de Gmail, se busca su hilo y su Message-ID para que Gmail los agrupe.
    let threadId: string | undefined;
    let enRespuestaA: string | null = null;
    if (p.responde_a) {
      const { data: original } = await db
        .from('interacciones')
        .select('externo_id, escuela_id')
        .eq('id', p.responde_a)
        .eq('origen', 'gmail')
        .maybeSingle();
      if (original?.externo_id && original.escuela_id === escuela.id) {
        const m = await gmail<MensajeOriginal>(token, `messages/${original.externo_id}`, { format: 'metadata', metadataHeaders: 'Message-ID' }).catch(() => null);
        if (m) {
          threadId = m.threadId;
          enRespuestaA = enUnaLinea(m.payload.headers.find((h) => h.name.toLowerCase() === 'message-id')?.value ?? '') || null;
        }
      }
    }

    const enviado = await gmail<{ id: string; threadId: string }>(token, 'messages/send', {}, {
      raw: base64url(armarMime(para, asunto, cuerpo, enRespuestaA)),
      ...(threadId ? { threadId } : {}),
    });

    // Se guarda con el id de Gmail: cuando corra la sync, el índice único evita duplicarlo.
    const ahora = new Date().toISOString();
    const { error } = await db.from('interacciones').insert({
      escuela_id: escuela.id,
      tipo: 'email_enviado',
      titulo: asunto,
      autor: miembro.nombre,
      fecha: ahora,
      cuerpo,
      origen: 'gmail',
      externo_id: enviado.id,
      de: integracion.cuenta,
      para,
      hilo: `gmail:${enviado.threadId}`,
      loop_id: p.loop_id ?? null,
      ticket_id: p.ticket_id ?? null,
    });
    if (error) console.error('Enviado pero no registrado', enviado.id, error);
    await db.from('escuelas').update({ ultimo_contacto: ahora }).eq('id', escuela.id);
    return json({ ok: true, id: enviado.id });
  } catch (e) {
    console.error(e);
    const revocado = e instanceof ErrorGoogle && e.codigo === 'invalid_grant';
    const sinPermiso = e instanceof ErrorGoogle && e.codigo === 'gmail_403';
    const mensaje = revocado || sinPermiso ? 'Reconectá Gmail en Integraciones y aceptá el permiso para enviar.' : 'Gmail no pudo enviar el email.';
    return json({ error: mensaje }, 502);
  }
});
