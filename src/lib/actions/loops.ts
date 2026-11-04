import { supabase } from '@/lib/supabase';
import { comprobar, insertarInteraccion, nuevoId, registrarCambio, type Avisos, type ContextoAccion } from '@/lib/actions/base';
import { enviarEmail, type EnvioEmail } from '@/lib/actions/email';
import { estadoDerivadoLoop, siguienteIdIssue, siguienteIdLoop } from '@/lib/domain/loops';
import type { Escuela, EstadoIssue, Issue, Loop, OrigenLoop } from '@/lib/types';

export interface NuevoLoopInput {
  titulo: string;
  quePidio: string;
  quienEsperaId: string | null;
  ownerId: string | null;
  origen: OrigenLoop;
  origenInteraccionId: string | null;
  actionItemId?: string;
}

export async function crearLoop(ctx: ContextoAccion, escuela: Escuela, input: NuevoLoopInput): Promise<void> {
  const { datos } = ctx;
  const id = siguienteIdLoop(escuela.codigo, datos.loops.map((l) => l.id));
  const issueId = siguienteIdIssue('CS', datos.issues);
  const ahora = new Date();
  const creado = ahora.toISOString();
  const owner = datos.equipo.find((m) => m.id === input.ownerId);
  const estado = estadoDerivadoLoop([{ estado: 'Todo' }]);

  const { error: errorLoop } = await supabase.from('loops').insert({
    id,
    escuela_id: escuela.id,
    titulo: input.titulo,
    que_pidio: input.quePidio,
    quien_espera: input.quienEsperaId,
    owner_id: input.ownerId,
    origen: input.origen,
    origen_interaccion_id: input.origenInteraccionId,
    estado,
    creado,
    cerrado: null,
  });
  comprobar(errorLoop);

  const { error: errorEstados } = await supabase.from('loop_estados').insert([
    { id: nuevoId(), loop_id: id, estado: 'Open', fecha: creado },
    { id: nuevoId(), loop_id: id, estado, fecha: new Date(ahora.getTime() + 1000).toISOString() },
  ]);
  comprobar(errorEstados);

  const { error: errorIssue } = await supabase.from('issues').insert({
    id: issueId,
    escuela_id: escuela.id,
    titulo: `[${escuela.nombre}] ${input.titulo}`,
    equipo: 'CS',
    estado: 'Todo',
    asignado: owner?.nombre ?? 'Sin asignar',
    actualizada: creado,
    loop_id: id,
  });
  comprobar(errorIssue);

  if (input.actionItemId && input.origenInteraccionId) {
    await vincularActionItem(ctx, input.origenInteraccionId, input.actionItemId, id);
  }

  await registrarCambio(ctx, escuela.id, `Loop ${id} creado: ${input.titulo}`, id);
}

async function vincularActionItem(ctx: ContextoAccion, interaccionId: string, itemId: string, loopId: string): Promise<void> {
  const interaccion = ctx.datos.interacciones.find((i) => i.id === interaccionId);
  if (!interaccion) throw new Error('No se encontró la reunión de origen');
  const action_items = interaccion.action_items.map((item) => (item.id === itemId ? { ...item, loop_id: loopId } : item));
  const { error } = await supabase.from('interacciones').update({ action_items }).eq('id', interaccionId);
  comprobar(error);
}

function issuesDelLoop(ctx: ContextoAccion, loopId: string): Issue[] {
  return ctx.datos.issues.filter((i) => i.loop_id === loopId);
}

async function recalcularLoop(ctx: ContextoAccion, loopId: string, issues: Pick<Issue, 'estado'>[]): Promise<Avisos> {
  const loop = ctx.datos.loops.find((l) => l.id === loopId);
  if (!loop || loop.estado === 'Closed') return;
  const nuevo = estadoDerivadoLoop(issues);
  if (nuevo === loop.estado) return;

  const { error } = await supabase.from('loops').update({ estado: nuevo }).eq('id', loopId);
  comprobar(error);
  const { error: errorEstado } = await supabase
    .from('loop_estados')
    .insert({ id: nuevoId(), loop_id: loopId, estado: nuevo, fecha: new Date().toISOString() });
  comprobar(errorEstado);
  await registrarCambio(ctx, loop.escuela_id, `Loop ${loopId}: ${loop.estado} → ${nuevo}`, loopId);

  if (nuevo === 'Ready to reply') {
    const owner = ctx.datos.equipo.find((m) => m.id === loop.owner_id)?.nombre ?? 'el equipo';
    return [`Aviso a Slack para ${owner} (simulado)`];
  }
}

export async function cambiarEstadoIssue(ctx: ContextoAccion, issue: Issue, estado: EstadoIssue): Promise<Avisos> {
  const { error } = await supabase
    .from('issues')
    .update({ estado, actualizada: new Date().toISOString() })
    .eq('id', issue.id);
  comprobar(error);
  await registrarCambio(ctx, issue.escuela_id, `Issue ${issue.id} pasó a ${estado}`, issue.loop_id);
  if (!issue.loop_id) return;
  const actualizadas = issuesDelLoop(ctx, issue.loop_id).map((i) => (i.id === issue.id ? { ...i, estado } : i));
  return recalcularLoop(ctx, issue.loop_id, actualizadas);
}

export async function ligarIssue(ctx: ContextoAccion, loop: Loop, issue: Issue): Promise<Avisos> {
  const { error } = await supabase.from('issues').update({ loop_id: loop.id }).eq('id', issue.id);
  comprobar(error);
  await registrarCambio(ctx, loop.escuela_id, `Issue ${issue.id} ligada al loop ${loop.id}`, loop.id);
  return recalcularLoop(ctx, loop.id, [...issuesDelLoop(ctx, loop.id), { estado: issue.estado }]);
}

export async function crearIssueTech(ctx: ContextoAccion, loop: Loop, titulo: string): Promise<Avisos> {
  const id = siguienteIdIssue('TECH', ctx.datos.issues);
  const { error } = await supabase.from('issues').insert({
    id,
    escuela_id: loop.escuela_id,
    titulo,
    equipo: 'Tech',
    estado: 'Todo',
    asignado: 'Sin asignar',
    actualizada: new Date().toISOString(),
    loop_id: loop.id,
  });
  comprobar(error);
  await registrarCambio(ctx, loop.escuela_id, `Issue ${id} creada en Tech para el loop ${loop.id}`, loop.id);
  return recalcularLoop(ctx, loop.id, [...issuesDelLoop(ctx, loop.id), { estado: 'Todo' }]);
}

const ESTADOS_CS_ABIERTOS: EstadoIssue[] = ['Backlog', 'Todo', 'In Progress', 'In Review'];

export async function responderLoop(ctx: ContextoAccion, loop: Loop, escuela: Escuela, envio: EnvioEmail): Promise<void> {
  await enviarEmail(ctx, escuela, envio, { loopId: loop.id });

  const cerrado = new Date().toISOString();
  const { error } = await supabase.from('loops').update({ estado: 'Closed', cerrado }).eq('id', loop.id);
  comprobar(error);
  const { error: errorEstado } = await supabase
    .from('loop_estados')
    .insert({ id: nuevoId(), loop_id: loop.id, estado: 'Closed', fecha: cerrado });
  comprobar(errorEstado);

  const { error: errorIssues } = await supabase
    .from('issues')
    .update({ estado: 'Done', actualizada: cerrado })
    .eq('loop_id', loop.id)
    .eq('equipo', 'CS')
    .in('estado', ESTADOS_CS_ABIERTOS);
  comprobar(errorIssues);

  await registrarCambio(ctx, loop.escuela_id, `Loop ${loop.id} cerrado tras responder`, loop.id);
}

export async function cambiarOwnerLoop(ctx: ContextoAccion, loop: Loop, ownerId: string): Promise<void> {
  const { error } = await supabase.from('loops').update({ owner_id: ownerId }).eq('id', loop.id);
  comprobar(error);
  const nombre = ctx.datos.equipo.find((m) => m.id === ownerId)?.nombre ?? 'sin owner';
  await registrarCambio(ctx, loop.escuela_id, `Owner del loop ${loop.id} cambiado a ${nombre}`, loop.id);
}

export async function comentarLoop(ctx: ContextoAccion, loop: Loop, texto: string): Promise<void> {
  await insertarInteraccion({
    escuela_id: loop.escuela_id,
    tipo: 'nota',
    titulo: 'Comentario',
    autor: ctx.yo.nombre,
    cuerpo: texto,
    loop_id: loop.id,
  });
}
