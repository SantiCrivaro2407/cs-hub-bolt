import { env } from './comun.ts';

export const SCOPE_LECTURA = 'https://www.googleapis.com/auth/gmail.readonly';
export const SCOPE_ENVIO = 'https://www.googleapis.com/auth/gmail.send';
export const SCOPES_GMAIL = [SCOPE_LECTURA, SCOPE_ENVIO];

/** El callback de OAuth es la propia función gmail-oauth. Debe estar cargado igual en Google Cloud. */
export function redirectUri(): string {
  return `${env('SUPABASE_URL')}/functions/v1/gmail-oauth`;
}

interface RespuestaToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

async function pedirToken(parametros: Record<string, string>): Promise<RespuestaToken> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env('GOOGLE_CLIENT_ID'), client_secret: env('GOOGLE_CLIENT_SECRET'), ...parametros }),
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new ErrorGoogle(cuerpo.error ?? 'token_error', cuerpo.error_description ?? JSON.stringify(cuerpo));
  return cuerpo;
}

export class ErrorGoogle extends Error {
  constructor(
    readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export function canjearCodigo(codigo: string): Promise<RespuestaToken> {
  return pedirToken({ grant_type: 'authorization_code', code: codigo, redirect_uri: redirectUri() });
}

export async function accessTokenDesdeRefresh(refreshToken: string): Promise<string> {
  return (await pedirToken({ grant_type: 'refresh_token', refresh_token: refreshToken })).access_token;
}

export async function gmail<T>(accessToken: string, ruta: string, params: Record<string, string> = {}, cuerpo?: unknown): Promise<T> {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/${ruta}`);
  for (const [clave, valor] of Object.entries(params)) url.searchParams.set(clave, valor);
  // Gmail limita las unidades por minuto por usuario: ante 429 o 403 por cuota se reintenta con espera creciente.
  for (let intento = 0; ; intento++) {
    const res = await fetch(url, {
      method: cuerpo === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, ...(cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    if (res.ok) return res.json();
    const texto = await res.text();
    const porCuota = res.status === 429 || (res.status === 403 && /quota|rateLimit/i.test(texto));
    if (!porCuota || intento >= REINTENTOS_CUOTA) throw new ErrorGoogle(`gmail_${res.status}`, texto);
    await new Promise((r) => setTimeout(r, 2000 * 2 ** intento));
  }
}

const REINTENTOS_CUOTA = 4;

// --- state firmado para el ida y vuelta de OAuth (sin sesión de por medio) ---

async function clave(): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(env('OAUTH_STATE_SECRET')), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function desdeBase64url(texto: string): Uint8Array<ArrayBuffer> {
  const normal = texto.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(normal + '='.repeat((4 - (normal.length % 4)) % 4)), (c) => c.charCodeAt(0));
}

export interface DatosState {
  equipoId: string;
  nonce: string;
}

/** El nonce se guarda en oauth_estados y se consume en la vuelta: cada state sirve una sola vez. */
export async function firmarState({ equipoId, nonce }: DatosState): Promise<string> {
  const datos = base64url(new TextEncoder().encode(JSON.stringify({ e: equipoId, n: nonce, t: Date.now() })));
  const firma = new Uint8Array(await crypto.subtle.sign('HMAC', await clave(), new TextEncoder().encode(datos)));
  return `${datos}.${base64url(firma)}`;
}

/** Devuelve equipo_id y nonce si la firma es válida y el state tiene menos de 15 minutos. */
export async function verificarState(state: string): Promise<DatosState | null> {
  const [datos, firma] = state.split('.');
  if (!datos || !firma) return null;
  try {
    const valida = await crypto.subtle.verify('HMAC', await clave(), desdeBase64url(firma), new TextEncoder().encode(datos));
    if (!valida) return null;
    const { e, n, t } = JSON.parse(new TextDecoder().decode(desdeBase64url(datos)));
    if (typeof e !== 'string' || typeof n !== 'string' || typeof t !== 'number') return null;
    return Date.now() - t < 15 * 60 * 1000 ? { equipoId: e, nonce: n } : null;
  } catch {
    // base64 o JSON mal formado: state inválido, no un error 500.
    return null;
  }
}
