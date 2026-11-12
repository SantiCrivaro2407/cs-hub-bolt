import { supabase } from '@/lib/supabase';
import { comprobar, insertarInteraccion, nuevoId, registrarCambio, type Avisos, type ContextoAccion } from '@/lib/actions/base';
import { enviarEmail, type EnvioEmail } from '@/lib/actions/email';
import { accionLinear, escuelaEnLinear, type SubIssuePropuesta } from '@/lib/actions/linear';
import { PREFIJO_ISSUE_DEMO } from '@/lib/demo/loadDemo';
import { estadoDerivadoLoop, siguienteIdIssue, siguienteIdLoop } from '@/lib/domain/loops';
import type { EquipoIssue, Escuela, EstadoIssue, Issue, Loop, OrigenLoop } from '@/lib/types';

export interface NuevoLoopInput {
  titulo: string;
  quePidio: string;
  quienEsperaId: string | null;
  ownerId: string | null;
  origen: OrigenLoop;
  origenInteraccionId: string | null;
  actionItemId?: string;
  subIssues: SubIssuePropuesta[];
}

const PREFIJO_EQUIPO: Record<EquipoIssue, string> = { CS: 'CS', Tech: 'TECH', Product: 'PRO' };

/** Id local para escuelas demo: nunca choca con un identificador real de Linear. */
function idIssueLocal(equipo: EquipoIssue, issues: Pick<Issue, 'id'>[]): string {
  const locales = issues.filter((i) => i.id.startsWith(PREFIJO_ISSUE_DEMO)).map((i) => ({ id: i.id.slice(PREFIJO_ISSUE_DEMO.length) }));
  return `${PREFIJO_ISSUE_DEMO}${siguienteIdIssue(PREFIJO_EQUIPO[equipo], locales)}`;
}

export async function crearLoop(ctx: ContextoAccion, escuela: Escuela, input: NuevoLoopInput): Promise<Avisos> {
  if (escuelaEnLinear(escuela)) {
    const r = await accionLinear<{ loop_id: string; sub_issues: string[] }>('crear_loop', {
      escuela_id: escuela.id,
      titulo: input.titulo,
      que_pidio: input.quePidio,
      quien_espera: input.quienEsperaId,
      owner_id: input.ownerId,
      origen: input.origen,
      origen_interaccion_id: input.origenInteraccionId,
      sub_issues: input.subIssues,
    });
    if (input.actionItemId && input.origenInteraccionId) {
      await vincularActionItem(ctx, input.origenInteraccionId, input.actionItemId, r.loop_id);
    }
    await registrarCambio(ctx, escuela.id, `Loop ${r.loop_id} creado en Linear: ${input.titulo}`, r.loop_id);
    return [`Creado en Linear: ${[r.loop_id, ...r.sub_issues].join(', ')}`];
  }
  await crearLoopLocal(ctx, escuela, input);
}

async function crearLoopLocal(ctx: ContextoAccion, escuela: Escuela, input: NuevoLoopInput): Promise<void> {
  const { datos } = ctx;
  const id = siguienteIdLoop(escuela.codigo, datos.loops.map((l) => l.id));
  const ahora = new Date();
  const creado = ahora.toISOString();
  const owner = datos.equipo.find((m) => m.id === input.ownerId);
  const estado = estadoDerivadoLoop(input.subIssues.map(() => ({ estado: 'Todo' as const })));

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

  const issues: Pick<Issue, 'id'>[] = [...datos.issues];
  const filas = input.subIssues.map((sub) => {
    const issueId = idIssueLocal(sub.equipo, issues);
    issues.push({ id: issueId });
    return {
      id: issueId,
      escuela_id: escuela.id,
      titulo: `[${escuela.nombre}] ${sub.titulo}`,
      descripcion: sub.descripcion || null,
      equipo: sub.equipo,
      estado: 'Todo',
      asignado: sub.equipo === 'CS' ? (owner?.nombre ?? 'Sin asignar') : 'Sin asignar',
      actualizada: creado,
      loop_id: id,
    };
  });
  if (filas.length) {
    const { error: errorIssues } = await supabase.from('issues').insert(filas);
    comprobar(errorIssues);
  }

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

const issueEnLinear = (ctx: ContextoAccion, issue: Pick<Issue, 'escuela_id' | 'id'>) => {
  const escuela = ctx.datos.escuelas.find((e) => e.id === issue.escuela_id);
  return !!escuela && escuelaEnLinear(escuela) && !issue.id.startsWith(PREFIJO_ISSUE_DEMO);
};

export async function cambiarEstadoIssue(ctx: ContextoAccion, issue: Issue, estado: EstadoIssue): Promise<Avisos> {
  if (issueEnLinear(ctx, issue)) {
    await accionLinear('cambiar_estado', { issue_id: issue.id, estado });
    await registrarCambio(ctx, issue.escuela_id, `Issue ${issue.id} pasó a ${estado} (Linear)`, issue.loop_id);
    return;
  }
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
  if (loop.linear_uuid && issueEnLinear(ctx, issue)) {
    await accionLinear('ligar_issue', { issue_id: issue.id, loop_id: loop.id });
    await registrarCambio(ctx, loop.escuela_id, `Issue ${issue.id} ligada al loop ${loop.id} (Linear)`, loop.id);
    return;
  }
  const { error } = await supabase.from('issues').update({ loop_id: loop.id }).eq('id', issue.id);
  comprobar(error);
  await registrarCambio(ctx, loop.escuela_id, `Issue ${issue.id} ligada al loop ${loop.id}`, loop.id);
  return recalcularLoop(ctx, loop.id, [...issuesDelLoop(ctx, loop.id), { estado: issue.estado }]);
}

export interface NuevaIssueInput {
  titulo: string;
  descripcion: string;
  equipo: EquipoIssue;
  loopId: string | null;
}

export async function crearIssue(ctx: ContextoAccion, escuela: Escuela, input: NuevaIssueInput): Promise<Avisos> {
  const loop = input.loopId ? ctx.datos.loops.find((l) => l.id === input.loopId) : undefined;
  if (escuelaEnLinear(escuela) && (!loop || loop.linear_uuid)) {
    const r = await accionLinear<{ issue_id: string }>('crear_issue', {
      escuela_id: escuela.id,
      titulo: input.titulo,
      descripcion: input.descripcion,
      equipo: input.equipo,
      loop_id: input.loopId,
    });
    await registrarCambio(ctx, escuela.id, `Issue ${r.issue_id} creada en Linear (${input.equipo})`, input.loopId);
    return [`Creada en Linear: ${r.issue_id}`];
  }
  const id = idIssueLocal(input.equipo, ctx.datos.issues);
  const { error } = await supabase.from('issues').insert({
    id,
    escuela_id: escuela.id,
    titulo: `[${escuela.nombre}] ${input.titulo}`,
    descripcion: input.descripcion || null,
    equipo: input.equipo,
    estado: 'Todo',
    asignado: 'Sin asignar',
    actualizada: new Date().toISOString(),
    loop_id: input.loopId,
  });
  comprobar(error);
  await registrarCambio(ctx, escuela.id, `Issue ${id} creada en ${input.equipo}`, input.loopId);
  if (input.loopId) return recalcularLoop(ctx, input.loopId, [...issuesDelLoop(ctx, input.loopId), { estado: 'Todo' }]);
}

const ESTADOS_CS_ABIERTOS: EstadoIssue[] = ['Backlog', 'Todo', 'In Progress', 'In Review'];

export async function responderLoop(ctx: ContextoAccion, loop: Loop, escuela: Escuela, envio: EnvioEmail): Promise<Avisos> {
  const avisos = await enviarEmail(ctx, escuela, envio, { loopId: loop.id });

  if (loop.linear_uuid) {
    await accionLinear('cerrar_loop', { loop_id: loop.id });
    await registrarCambio(ctx, loop.escuela_id, `Loop ${loop.id} cerrado tras responder (Linear)`, loop.id);
    return [...(avisos ?? []), 'Loop cerrado en Linear'];
  }

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
  return avisos;
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
