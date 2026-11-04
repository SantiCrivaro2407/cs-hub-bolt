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
  const email = data.user?.email?.toLowerCase();
  if (!email) return null;
  const { data: miembro } = await db.from('equipo').select('id, nombre, email').ilike('email', email).maybeSingle();
  return miembro;
}

const PATRON_EMAIL = /[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;

/** Extrae los emails de un header tipo `"Ana" <ana@x.com>, b@y.com`, en minúscula. */
export function extraerEmails(texto: string | null | undefined): string[] {
  return [...new Set((texto ?? '').match(PATRON_EMAIL)?.map((e) => e.toLowerCase()) ?? [])];
}

export interface ContactoWhitelist {
  id: string;
  escuela_id: string;
  nombre: string;
}

/** La whitelist: email de contacto → contactos (un email puede estar cargado en más de una escuela). */
export async function cargarWhitelist(db: SupabaseClient): Promise<Map<string, ContactoWhitelist[]>> {
  const { data, error } = await db.from('contactos').select('id, escuela_id, nombre, email').not('email', 'is', null);
  if (error) throw new Error(`No se pudieron leer los contactos: ${error.message}`);
  const mapa = new Map<string, ContactoWhitelist[]>();
  for (const c of data ?? []) {
    const email = String(c.email).trim().toLowerCase();
    if (!email) continue;
    mapa.set(email, [...(mapa.get(email) ?? []), { id: c.id, escuela_id: c.escuela_id, nombre: c.nombre }]);
  }
  return mapa;
}

/** Escuelas involucradas según los emails que participan del intercambio. */
export function escuelasDe(emails: string[], whitelist: Map<string, ContactoWhitelist[]>): string[] {
  return [...new Set(emails.flatMap((e) => whitelist.get(e) ?? []).map((c) => c.escuela_id))];
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
