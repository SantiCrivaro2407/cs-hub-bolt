// Espejo de Linear: un único camino para guardar issues/loops en la base, lo use la sync, el webhook o el hub.
// Modelo: un loop es una issue del equipo CS con el label "Loop"; sus sub-issues (cualquier equipo) son las issues ligadas.
// La escuela sale del título ("[St. Francis] ..."), del label de CS o, para sub-issues, de su loop.
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { env } from './comun.ts';

const API = 'https://api.linear.app/graphql';
export const LABEL_LOOP = 'Loop';
export const EQUIPOS: Record<string, 'CS' | 'Tech' | 'Product'> = { CS: 'CS', TECH: 'Tech', PRO: 'Product' };
export const CLAVE_EQUIPO: Record<'CS' | 'Tech' | 'Product', string> = { CS: 'CS', Tech: 'TECH', Product: 'PRO' };
const ESTADOS_HUB = ['Backlog', 'Todo', 'In Progress', 'In Review', 'Done', 'Canceled'] as const;
type EstadoHub = (typeof ESTADOS_HUB)[number];

export const CAMPOS_ISSUE = `
  id identifier title description url createdAt updatedAt completedAt canceledAt
  state { name type }
  team { key }
  assignee { name email }
  labels { nodes { name } }
  parent { id }
`;

export interface IssueLinear {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  url: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  canceledAt: string | null;
  state: { name: string; type: string };
  team: { key: string };
  assignee: { name: string; email: string } | null;
  labels: { nodes: { name: string }[] };
  parent: { id: string } | null;
}

export class ErrorLinear extends Error {}

export async function linear<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: env('LINEAR_API_KEY') },
    body: JSON.stringify({ query, variables }),
  });
  const cuerpo = await res.json().catch(() => null);
  if (!res.ok || cuerpo?.errors?.length) {
    const mensaje = cuerpo?.errors?.[0]?.message ?? `HTTP ${res.status}`;
    throw new ErrorLinear(`Linear: ${mensaje}`);
  }
  return cuerpo.data as T;
}

// ---------- Lectura ----------

export async function issuePorId(id: string): Promise<IssueLinear | null> {
  try {
    const data = await linear<{ issue: IssueLinear }>(`query($id: String!) { issue(id: $id) { ${CAMPOS_ISSUE} } }`, { id });
    return data.issue;
  } catch (e) {
    if (e instanceof ErrorLinear && /not found|Entity not found/i.test(e.message)) return null;
    throw e;
  }
}

export async function hijasDe(id: string): Promise<IssueLinear[]> {
  const data = await linear<{ issue: { children: { nodes: IssueLinear[] } } }>(
    `query($id: String!) { issue(id: $id) { children(first: 100) { nodes { ${CAMPOS_ISSUE} } } } }`,
    { id },
  );
  return data.issue.children.nodes;
}

interface Equipo {
  id: string;
  key: string;
  states: { nodes: { id: string; name: string; type: string }[] };
  labels: { nodes: { id: string; name: string }[] };
}

const cacheEquipos = new Map<string, Equipo>();

export async function equipoLinear(clave: string): Promise<Equipo> {
  const enCache = cacheEquipos.get(clave);
  if (enCache) return enCache;
  const data = await linear<{ teams: { nodes: Equipo[] } }>(
    `query($key: String!) { teams(filter: { key: { eq: $key } }) { nodes {
       id key states { nodes { id name type } } labels(first: 250) { nodes { id name } }
     } } }`,
    { key: clave },
  );
  const equipo = data.teams.nodes[0];
  if (!equipo) throw new ErrorLinear(`Linear: no existe el equipo ${clave}`);
  cacheEquipos.set(clave, equipo);
  return equipo;
}

async function labelsDelWorkspace(): Promise<{ id: string; name: string }[]> {
  const data = await linear<{ issueLabels: { nodes: { id: string; name: string; team: { id: string } | null }[] } }>(
    `{ issueLabels(first: 250, filter: { team: { null: true } }) { nodes { id name team { id } } } }`,
  );
  return data.issueLabels.nodes;
}

async function usuarioPorEmail(email: string | null | undefined): Promise<string | null> {
  if (!email) return null;
  const data = await linear<{ users: { nodes: { id: string }[] } }>(
    `query($email: String!) { users(filter: { email: { eqIgnoreCase: $email } }) { nodes { id } } }`,
    { email },
  );
  return data.users.nodes[0]?.id ?? null;
}

const TIPO_POR_ESTADO: Record<EstadoHub, string> = {
  Backlog: 'backlog',
  Todo: 'unstarted',
  'In Progress': 'started',
  'In Review': 'started',
  Done: 'completed',
  Canceled: 'canceled',
};

function estadoDeEquipo(equipo: Equipo, estado: EstadoHub): string | undefined {
  const estados = equipo.states.nodes;
  return (
    estados.find((s) => s.name.toLowerCase() === estado.toLowerCase())?.id ??
    estados.find((s) => s.type === TIPO_POR_ESTADO[estado])?.id
  );
}

// ---------- Escritura ----------

export interface NuevaIssueLinear {
  equipo: 'CS' | 'Tech' | 'Product';
  titulo: string;
  descripcion?: string;
  parentId?: string | null;
  labels?: (string | null | undefined)[];
  asignadoEmail?: string | null;
  estado?: EstadoHub;
}

export async function crearIssueLinear(nueva: NuevaIssueLinear): Promise<IssueLinear> {
  const equipo = await equipoLinear(CLAVE_EQUIPO[nueva.equipo]);
  const nombres = (nueva.labels ?? []).filter((l): l is string => !!l);
  let labelIds: string[] = [];
  if (nombres.length) {
    const disponibles = [...equipo.labels.nodes, ...(await labelsDelWorkspace())];
    labelIds = nombres.map((n) => disponibles.find((l) => l.name.toLowerCase() === n.toLowerCase())?.id).filter((id): id is string => !!id);
  }
  const input: Record<string, unknown> = {
    teamId: equipo.id,
    title: nueva.titulo,
    description: nueva.descripcion ?? '',
    stateId: estadoDeEquipo(equipo, nueva.estado ?? 'Todo'),
  };
  if (labelIds.length) input.labelIds = labelIds;
  if (nueva.parentId) input.parentId = nueva.parentId;
  const asignado = await usuarioPorEmail(nueva.asignadoEmail);
  if (asignado) input.assigneeId = asignado;

  const data = await linear<{ issueCreate: { success: boolean; issue: IssueLinear } }>(
    `mutation($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { ${CAMPOS_ISSUE} } } }`,
    { input },
  );
  if (!data.issueCreate.success) throw new ErrorLinear('Linear no pudo crear la issue');
  return data.issueCreate.issue;
}

export async function actualizarIssueLinear(
  uuid: string,
  cambios: { estado?: EstadoHub; parentId?: string | null; equipoActual?: string },
): Promise<IssueLinear> {
  const input: Record<string, unknown> = {};
  if (cambios.estado) {
    const actual = cambios.equipoActual ?? (await issuePorId(uuid))?.team.key;
    if (!actual) throw new ErrorLinear('Linear: la issue ya no existe');
    const stateId = estadoDeEquipo(await equipoLinear(actual), cambios.estado);
    if (!stateId) throw new ErrorLinear(`Linear: el equipo ${actual} no tiene un estado ${cambios.estado}`);
    input.stateId = stateId;
  }
  if (cambios.parentId !== undefined) input.parentId = cambios.parentId;
  const data = await linear<{ issueUpdate: { success: boolean; issue: IssueLinear } }>(
    `mutation($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success issue { ${CAMPOS_ISSUE} } } }`,
    { id: uuid, input },
  );
  if (!data.issueUpdate.success) throw new ErrorLinear('Linear no pudo actualizar la issue');
  return data.issueUpdate.issue;
}

// ---------- Escuelas ----------

export interface EscuelaLinear {
  id: string;
  alias: string[];
  label: string | null;
}

export async function escuelasLinear(db: SupabaseClient): Promise<EscuelaLinear[]> {
  const { data, error } = await db.from('escuelas').select('id, linear_alias, linear_label').not('linear_alias', 'is', null);
  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => ({
    id: e.id,
    alias: String(e.linear_alias).split(',').map((a) => a.trim()).filter(Boolean),
    label: e.linear_label,
  }));
}

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const escaparRegex = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const aparece = (titulo: string, alias: string) =>
  new RegExp(`(^|[^a-z0-9])${escaparRegex(normalizar(alias))}($|[^a-z0-9])`).test(normalizar(titulo));

/**
 * La escuela que nombra el título. Gana el alias más largo ("British Barra" antes que "British"); los alias con "~"
 * (el nombre del grupo, como "~Transforma") solo cuentan si no aparece el nombre de ningún colegio concreto.
 */
export function escuelaPorTitulo(titulo: string, escuelas: EscuelaLinear[]): string | null {
  for (const respaldo of [false, true]) {
    let mejor: { id: string; largo: number } | null = null;
    for (const e of escuelas) {
      for (const crudo of e.alias) {
        if (crudo.startsWith('~') !== respaldo) continue;
        const alias = crudo.replace(/^~/, '');
        if (aparece(titulo, alias) && (!mejor || alias.length > mejor.largo)) mejor = { id: e.id, largo: alias.length };
      }
    }
    if (mejor) return mejor.id;
  }
  return null;
}

function escuelaPorLabel(issue: IssueLinear, escuelas: EscuelaLinear[]): string | null {
  const nombres = issue.labels.nodes.map((l) => normalizar(l.name));
  // El primero con ese label: para labels compartidos (British, Transforma) es la escuela "principal" del grupo.
  return escuelas.find((e) => e.label && nombres.includes(normalizar(e.label)))?.id ?? null;
}

export function prefijoTitulo(alias: string, titulo: string): string {
  return titulo.trimStart().startsWith('[') ? titulo : `[${alias}] ${titulo}`;
}

const sinPrefijo = (titulo: string) => titulo.replace(/^\s*\[[^\]]*\]\s*[-–:]?\s*/, '').trim() || titulo;

const FIRMA = '\n\n---\n_Creado desde el CS Hub._';
const sinFirma = (texto: string | null) => (texto ?? '').replace(FIRMA, '').trim();
export const conFirma = (texto: string) => `${texto.trim()}${FIRMA}`;

// ---------- Guardado en la base ----------

function estadoHub(state: IssueLinear['state']): EstadoHub {
  const porNombre = ESTADOS_HUB.find((e) => e.toLowerCase() === state.name.toLowerCase());
  if (porNombre) return porNombre;
  switch (state.type) {
    case 'unstarted':
      return 'Todo';
    case 'started':
      return 'In Progress';
    case 'completed':
      return 'Done';
    case 'canceled':
      return 'Canceled';
    default:
      return 'Backlog';
  }
}

const esLoop = (i: IssueLinear) => i.team.key === 'CS' && i.labels.nodes.some((l) => l.name.toLowerCase() === LABEL_LOOP.toLowerCase());
const resuelta = (estado: string) => estado === 'Done' || estado === 'Canceled';

function estadoDerivadoLoop(estados: string[]): 'Open' | 'Waiting' | 'Ready to reply' {
  if (estados.length === 0) return 'Open';
  return estados.every(resuelta) ? 'Ready to reply' : 'Waiting';
}

interface Resultado {
  loops: string[];
  issues: string[];
}

/**
 * Guarda en la base lo que vino de Linear. Ignora lo que no es de ninguna escuela sincronizada.
 * Devuelve los ids (del hub) de los loops e issues guardados.
 */
export async function guardarDesdeLinear(db: SupabaseClient, nodos: IssueLinear[]): Promise<Resultado> {
  const resultado: Resultado = { loops: [], issues: [] };
  if (nodos.length === 0) return resultado;
  const escuelas = await escuelasLinear(db);
  const { data: equipo } = await db.from('equipo').select('id, email');
  const miembroPorEmail = (email?: string | null) =>
    email ? (equipo ?? []).find((m) => String(m.email).toLowerCase() === email.toLowerCase())?.id ?? null : null;

  const uuids = nodos.map((n) => n.id);
  const identificadores = nodos.map((n) => n.identifier);
  const padres = nodos.map((n) => n.parent?.id).filter((p): p is string => !!p);

  const [{ data: loopsExistentes }, { data: issuesExistentes }] = await Promise.all([
    db.from('loops').select('id, escuela_id, linear_uuid, estado').or(
      `linear_uuid.in.(${[...uuids, ...padres].join(',')}),id.in.(${identificadores.map((i) => `"${i}"`).join(',')})`,
    ),
    db.from('issues').select('id, escuela_id, linear_uuid, loop_id').or(
      `linear_uuid.in.(${uuids.join(',')}),id.in.(${identificadores.map((i) => `"${i}"`).join(',')})`,
    ),
  ]);
  const loopPorUuid = new Map((loopsExistentes ?? []).filter((l) => l.linear_uuid).map((l) => [l.linear_uuid as string, l]));
  const loopPorId = new Map((loopsExistentes ?? []).map((l) => [l.id, l]));
  const issuePorUuid = new Map((issuesExistentes ?? []).filter((i) => i.linear_uuid).map((i) => [i.linear_uuid as string, i]));
  const issuePorIdent = new Map((issuesExistentes ?? []).map((i) => [i.id, i]));

  const tocados = new Set<string>();

  // Primero los loops, para que las sub-issues del mismo lote encuentren a su padre.
  for (const n of nodos.filter(esLoop)) {
    const existente = loopPorUuid.get(n.id) ?? loopPorId.get(n.identifier);
    const escuelaId = existente?.escuela_id ?? escuelaPorTitulo(n.title, escuelas) ?? escuelaPorLabel(n, escuelas);
    if (!escuelaId) continue;
    const id = existente?.id ?? n.identifier;
    const cerradoEnLinear = resuelta(estadoHub(n.state));
    const fila: Record<string, unknown> = {
      id,
      escuela_id: escuelaId,
      titulo: sinPrefijo(n.title),
      que_pidio: sinFirma(n.description),
      creado: n.createdAt,
      url: n.url,
      linear_uuid: n.id,
    };
    const owner = miembroPorEmail(n.assignee?.email);
    if (owner) fila.owner_id = owner;
    if (!existente) {
      fila.origen = 'manual';
      fila.estado = cerradoEnLinear ? 'Closed' : 'Open';
      fila.cerrado = cerradoEnLinear ? (n.completedAt ?? n.canceledAt ?? n.updatedAt) : null;
    }
    const { error } = await db.from('loops').upsert(fila, { onConflict: 'id' });
    if (error) throw new Error(`No se pudo guardar el loop ${id}: ${error.message}`);
    if (!existente) {
      await db.from('loop_estados').insert({ loop_id: id, estado: fila.estado, fecha: n.createdAt });
    }
    const guardado = { id, escuela_id: escuelaId, linear_uuid: n.id, estado: (existente?.estado ?? fila.estado) as string };
    loopPorUuid.set(n.id, guardado);
    loopPorId.set(id, guardado);
    resultado.loops.push(id);
    tocados.add(id);
    await sincronizarCierreLoop(db, guardado, cerradoEnLinear, n);
  }

  // Padres que no vinieron en el lote ni estaban en la base (por ejemplo, el loop de una sub-issue nueva).
  const faltantes = [...new Set(nodos.filter((n) => !esLoop(n) && n.parent && !loopPorUuid.has(n.parent.id)).map((n) => n.parent!.id))];
  for (const uuid of faltantes) {
    const padre = await issuePorId(uuid);
    if (padre && esLoop(padre)) {
      const r = await guardarDesdeLinear(db, [padre]);
      for (const id of r.loops) {
        const { data } = await db.from('loops').select('id, escuela_id, linear_uuid, estado').eq('id', id).single();
        if (data) loopPorUuid.set(uuid, data);
      }
    }
  }

  for (const n of nodos.filter((x) => !esLoop(x))) {
    const existente = issuePorUuid.get(n.id) ?? issuePorIdent.get(n.identifier);
    const loop = n.parent ? loopPorUuid.get(n.parent.id) : undefined;
    const escuelaId = existente?.escuela_id ?? loop?.escuela_id ?? escuelaPorTitulo(n.title, escuelas) ?? escuelaPorLabel(n, escuelas);
    if (!escuelaId) continue;
    const id = existente?.id ?? n.identifier;
    const { error } = await db.from('issues').upsert(
      {
        id,
        escuela_id: escuelaId,
        titulo: n.title,
        equipo: EQUIPOS[n.team.key] ?? 'Tech',
        estado: estadoHub(n.state),
        asignado: n.assignee?.name ?? 'Sin asignar',
        actualizada: n.updatedAt,
        loop_id: loop?.id ?? null,
        descripcion: sinFirma(n.description) || null,
        url: n.url,
        linear_uuid: n.id,
      },
      { onConflict: 'id' },
    );
    if (error) throw new Error(`No se pudo guardar la issue ${id}: ${error.message}`);
    resultado.issues.push(id);
    if (loop) tocados.add(loop.id);
    // Si dejó de ser hija de un loop, ese loop también cambia.
    if (existente?.loop_id) tocados.add(existente.loop_id);
  }

  for (const loopId of tocados) await recalcularLoop(db, loopId);
  return resultado;
}

async function sincronizarCierreLoop(
  db: SupabaseClient,
  loop: { id: string; estado: string },
  cerradoEnLinear: boolean,
  n: IssueLinear,
): Promise<void> {
  const ahora = new Date().toISOString();
  if (cerradoEnLinear && loop.estado !== 'Closed') {
    await db.from('loops').update({ estado: 'Closed', cerrado: n.completedAt ?? n.canceledAt ?? ahora }).eq('id', loop.id);
    await db.from('loop_estados').insert({ loop_id: loop.id, estado: 'Closed', fecha: ahora });
    loop.estado = 'Closed';
  } else if (!cerradoEnLinear && loop.estado === 'Closed') {
    // Reabierto en Linear: vuelve al estado que corresponda según sus issues.
    await db.from('loops').update({ estado: 'Open', cerrado: null }).eq('id', loop.id);
    loop.estado = 'Open';
  }
}

export async function recalcularLoop(db: SupabaseClient, loopId: string): Promise<void> {
  const { data: loop } = await db.from('loops').select('id, estado').eq('id', loopId).maybeSingle();
  if (!loop || loop.estado === 'Closed') return;
  const { data: issues } = await db.from('issues').select('estado').eq('loop_id', loopId);
  const nuevo = estadoDerivadoLoop((issues ?? []).map((i) => i.estado));
  if (nuevo === loop.estado) return;
  await db.from('loops').update({ estado: nuevo }).eq('id', loopId);
  await db.from('loop_estados').insert({ loop_id: loopId, estado: nuevo, fecha: new Date().toISOString() });
}

/** Una issue o loop borrado en Linear se borra del hub. */
export async function borrarDesdeLinear(db: SupabaseClient, uuid: string): Promise<void> {
  const { data: issue } = await db.from('issues').select('id, loop_id').eq('linear_uuid', uuid).maybeSingle();
  if (issue) {
    await db.from('issues').delete().eq('id', issue.id);
    if (issue.loop_id) await recalcularLoop(db, issue.loop_id);
  }
  await db.from('loops').delete().eq('linear_uuid', uuid);
}
