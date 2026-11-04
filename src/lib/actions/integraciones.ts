import { supabase } from '@/lib/supabase';
import { comprobar, type ContextoAccion } from '@/lib/actions/base';
import type { Integracion, ProveedorIntegracion } from '@/lib/types';

export function miIntegracion(ctx: ContextoAccion, proveedor: ProveedorIntegracion): Integracion | null {
  return ctx.datos.integraciones.find((i) => i.equipo_id === ctx.yo.id && i.proveedor === proveedor && i.estado !== 'desconectada') ?? null;
}

export function urlWebhookReadAI(token: string): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/readai-webhook?token=${token}`;
}

async function invocar<T>(funcion: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke(funcion, { method: 'POST' });
  if (error) {
    // Las funciones responden { error } con un mensaje para el usuario.
    const detalle = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(detalle?.error ?? 'No se pudo contactar al servidor de integraciones.');
  }
  return data as T;
}

/** Pide a la Edge Function la URL de consentimiento de Google y lleva al usuario ahí. */
export async function conectarGmail(): Promise<void> {
  const { url } = await invocar<{ url: string }>('gmail-oauth');
  window.location.assign(url);
}

export async function sincronizarGmail(): Promise<number> {
  const { nuevas } = await invocar<{ nuevas: number }>('gmail-sync');
  return nuevas;
}

function nuevoToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Read AI no usa OAuth: se le carga una URL de webhook con un token propio de cada miembro. */
export async function conectarReadAI(ctx: ContextoAccion): Promise<void> {
  const { error } = await supabase
    .from('integraciones')
    .upsert(
      { equipo_id: ctx.yo.id, proveedor: 'readai', estado: 'conectada', cuenta: ctx.yo.email, config: { token: nuevoToken() }, ultimo_error: null },
      { onConflict: 'equipo_id,proveedor' },
    );
  comprobar(error);
}

export async function desconectar(integracion: Integracion): Promise<void> {
  // Para Read AI, el token viejo deja de servir al reconectar (se genera uno nuevo).
  const { error } = await supabase.from('integraciones').update({ estado: 'desconectada', config: {} }).eq('id', integracion.id);
  comprobar(error);
}
