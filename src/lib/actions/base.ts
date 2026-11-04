import { supabase } from '@/lib/supabase';
import type { ActionItem, Equipo, HubData, TipoInteraccion } from '@/lib/types';

export interface ContextoAccion {
  datos: HubData;
  yo: Equipo;
}

export type Avisos = string[] | void;

export interface NuevaInteraccion {
  escuela_id: string;
  tipo: TipoInteraccion;
  titulo: string;
  autor: string;
  cuerpo?: string;
  duracion_min?: number | null;
  action_items?: ActionItem[];
  loop_id?: string | null;
  ticket_id?: string | null;
}

export function comprobar(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export function nuevoId(): string {
  return crypto.randomUUID();
}

export function ahoraIso(): string {
  return new Date().toISOString();
}

export async function insertarInteraccion(datos: NuevaInteraccion): Promise<void> {
  const { error } = await supabase.from('interacciones').insert({
    id: nuevoId(),
    fecha: ahoraIso(),
    cuerpo: '',
    duracion_min: null,
    action_items: [],
    loop_id: null,
    ticket_id: null,
    ...datos,
  });
  comprobar(error);
}

export function registrarCambio(ctx: ContextoAccion, escuelaId: string, titulo: string, loopId: string | null = null): Promise<void> {
  return insertarInteraccion({
    escuela_id: escuelaId,
    tipo: 'registro_interno',
    titulo,
    autor: ctx.yo.nombre,
    loop_id: loopId,
  });
}
