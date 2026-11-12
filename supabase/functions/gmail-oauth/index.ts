// Conecta el Gmail de un miembro del equipo (solo lectura).
//   POST (con la sesión del backoffice)  → devuelve la URL de consentimiento de Google.
//   GET  ?code&state (vuelta de Google)  → guarda el refresh token y redirige al backoffice.
// Se despliega con --no-verify-jwt: la vuelta de Google no trae JWT; el state va firmado.
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { admin, CORS, env, json, miembroDesdeRequest } from '../_shared/comun.ts';
import { canjearCodigo, firmarState, gmail, redirectUri, SCOPE_ENVIO, SCOPES_GMAIL, verificarState } from '../_shared/google.ts';

async function nuevoNonce(db: SupabaseClient, equipoId: string): Promise<string> {
  // De paso se limpian los que nadie usó (el state vence a los 15 minutos).
  await db.from('oauth_estados').delete().lt('creado', new Date(Date.now() - 60 * 60 * 1000).toISOString());
  const nonce = crypto.randomUUID();
  const { error } = await db.from('oauth_estados').insert({ nonce, equipo_id: equipoId });
  if (error) throw new Error(`No se pudo iniciar la conexión: ${error.message}`);
  return nonce;
}

/** Borra el nonce y dice si existía: un state ya usado (o de otro miembro) no vuelve a servir. */
async function consumirNonce(db: SupabaseClient, equipoId: string, nonce: string): Promise<boolean> {
  const { data } = await db.from('oauth_estados').delete().eq('nonce', nonce).eq('equipo_id', equipoId).select('nonce');
  return (data?.length ?? 0) > 0;
}

function volverAlBackoffice(resultado: 'ok' | 'error', detalle?: string): Response {
  const url = new URL('/integraciones', env('APP_URL'));
  url.searchParams.set('gmail', resultado);
  if (detalle) url.searchParams.set('detalle', detalle);
  return Response.redirect(url.toString(), 302);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const db = admin();

  if (req.method === 'POST') {
    const miembro = await miembroDesdeRequest(db, req);
    if (!miembro) return json({ error: 'Tu cuenta no está en el equipo de CS.' }, 401);
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: env('GOOGLE_CLIENT_ID'),
      redirect_uri: redirectUri(),
      response_type: 'code',
      scope: SCOPES_GMAIL.join(' '),
      access_type: 'offline',
      prompt: 'consent', // sin esto Google no reenvía el refresh token en reconexiones
      include_granted_scopes: 'true',
      login_hint: miembro.email,
      state: await firmarState({ equipoId: miembro.id, nonce: await nuevoNonce(db, miembro.id) }),
    }).toString();
    return json({ url: url.toString() });
  }

  const params = new URL(req.url).searchParams;
  if (params.get('error')) return volverAlBackoffice('error', params.get('error') ?? undefined);

  const state = await verificarState(params.get('state') ?? '');
  const codigo = params.get('code');
  if (!state || !codigo || !(await consumirNonce(db, state.equipoId, state.nonce))) return volverAlBackoffice('error', 'state_invalido');
  const equipoId = state.equipoId;

  try {
    const tokens = await canjearCodigo(codigo);
    if (!tokens.refresh_token) return volverAlBackoffice('error', 'sin_refresh_token');
    const perfil = await gmail<{ emailAddress: string }>(tokens.access_token, 'profile');
    // Solo se conecta el Gmail del propio miembro: el link de consentimiento no se puede usar para otra casilla.
    const { data: miembro } = await db.from('equipo').select('email').eq('id', equipoId).maybeSingle();
    if (!miembro || perfil.emailAddress.toLowerCase() !== String(miembro.email).trim().toLowerCase()) {
      return volverAlBackoffice('error', 'cuenta_distinta');
    }

    const { data: integracion, error } = await db
      .from('integraciones')
      .upsert(
        {
          equipo_id: equipoId,
          proveedor: 'gmail',
          estado: 'conectada',
          cuenta: perfil.emailAddress.toLowerCase(),
          ultimo_error: null,
          // Google deja destildar permisos en la pantalla de consentimiento: se guarda si el de envío quedó.
          config: { envio: (tokens.scope ?? '').split(' ').includes(SCOPE_ENVIO) },
        },
        { onConflict: 'equipo_id,proveedor' },
      )
      .select('id')
      .single();
    if (error) throw error;

    const { error: errorSecreto } = await db
      .from('integracion_secretos')
      .upsert({ integracion_id: integracion.id, refresh_token: tokens.refresh_token, actualizado: new Date().toISOString() });
    if (errorSecreto) throw errorSecreto;

    return volverAlBackoffice('ok');
  } catch (e) {
    console.error(e);
    return volverAlBackoffice('error', 'no_se_pudo_guardar');
  }
});
