import { supabase } from '@/lib/supabase';
import { ErrorVisible } from '@/lib/actions/base';
import type { EquipoIssue, Escuela } from '@/lib/types';

/** Las escuelas reales se sincronizan con Linear; las demo (sin alias) viven solo en el hub. */
export function escuelaEnLinear(escuela: Pick<Escuela, 'linear_alias'>): boolean {
  return !!escuela.linear_alias?.trim();
}

async function invocar<T>(funcion: string, cuerpo: Record<string, unknown>, porDefecto: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke(funcion, { body: cuerpo });
  if (error) {
    const detalle = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new ErrorVisible(detalle?.error ?? porDefecto);
  }
  return data as T;
}

export function accionLinear<T = Record<string, unknown>>(accion: string, cuerpo: Record<string, unknown>): Promise<T> {
  return invocar<T>('linear-acciones', { accion, ...cuerpo }, 'No se pudo actualizar Linear.');
}

export function sincronizarLinear(): Promise<{ revisadas: number; loops: number; issues: number }> {
  return invocar('linear-sync', {}, 'No se pudo sincronizar con Linear.');
}

export interface SubIssuePropuesta {
  titulo: string;
  descripcion: string;
  equipo: EquipoIssue;
}

export interface PropuestaLoop {
  titulo: string;
  que_pidio: string;
  quien_espera: string | null;
  sub_issues: SubIssuePropuesta[];
}

export interface OrigenPropuesta {
  ticketId?: string;
  interaccionId?: string;
  actionItem?: string;
}

export function proponerLoop(escuelaId: string, origen: OrigenPropuesta): Promise<PropuestaLoop> {
  return invocar<PropuestaLoop>(
    'loop-propuesta',
    { escuela_id: escuelaId, ticket_id: origen.ticketId, interaccion_id: origen.interaccionId, action_item: origen.actionItem },
    'No se pudo armar la propuesta.',
  );
}
