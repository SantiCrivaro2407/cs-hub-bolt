import { supabase } from '@/lib/supabase';
import { generarSincronizacionSimulada } from '@/lib/demo/simulacion';
import { comprobar, insertarInteraccion, registrarCambio, type ContextoAccion } from '@/lib/actions/base';
import type { Escuela, Etapa, FichaCampo } from '@/lib/types';

export async function cambiarOwnerEscuela(ctx: ContextoAccion, escuela: Escuela, ownerId: string): Promise<void> {
  const { error } = await supabase.from('escuelas').update({ owner_id: ownerId }).eq('id', escuela.id);
  comprobar(error);
  const nombre = ctx.datos.equipo.find((m) => m.id === ownerId)?.nombre ?? 'sin owner';
  await registrarCambio(ctx, escuela.id, `Owner cambiado a ${nombre}`);
}

export async function cambiarEtapaEscuela(ctx: ContextoAccion, escuela: Escuela, etapa: Etapa): Promise<void> {
  const { error } = await supabase.from('escuelas').update({ etapa }).eq('id', escuela.id);
  comprobar(error);
  await registrarCambio(ctx, escuela.id, `Etapa cambiada a ${etapa}`);
}

export interface CambioCampo {
  campo: FichaCampo;
  valor: string;
}

export async function guardarCamposFicha(ctx: ContextoAccion, escuela: Escuela, cambios: CambioCampo[]): Promise<void> {
  for (const { campo, valor } of cambios) {
    const limpio = valor.trim() === '' ? null : valor.trim();
    const { error } = await supabase
      .from('ficha_campos')
      .update({ valor: limpio, actualizado: new Date().toISOString() })
      .eq('id', campo.id);
    comprobar(error);
    const accion = limpio ? 'actualizado' : 'vaciado';
    await registrarCambio(ctx, escuela.id, `Ficha · ${campo.seccion}: ${campo.campo} ${accion}`);
  }
}

export async function agregarNota(ctx: ContextoAccion, escuelaId: string, titulo: string, cuerpo: string): Promise<void> {
  await insertarInteraccion({
    escuela_id: escuelaId,
    tipo: 'nota',
    titulo,
    autor: ctx.yo.nombre,
    cuerpo,
  });
}

export async function simularSincronizacion(ctx: ContextoAccion, escuela: Escuela): Promise<number> {
  const contactos = ctx.datos.contactos.filter((c) => c.escuela_id === escuela.id && c.email);
  const interacciones = generarSincronizacionSimulada(escuela, contactos);
  for (const interaccion of interacciones) {
    await insertarInteraccion(interaccion);
  }
  return interacciones.length;
}

