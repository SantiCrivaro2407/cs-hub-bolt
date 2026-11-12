// Acciones del hub que escriben en Linear primero y después guardan el espejo en la base.
//   POST (con la sesión del backoffice) { accion, ... }
//     crear_loop      { escuela_id, titulo, que_pidio, quien_espera?, owner_id?, origen, origen_interaccion_id?, sub_issues[] }
//     crear_issue     { escuela_id, titulo, descripcion?, equipo, loop_id? }
//     cambiar_estado  { issue_id, estado }
//     ligar_issue     { issue_id, loop_id }
//     cerrar_loop     { loop_id }
// Solo para escuelas con linear_alias (las demo se manejan localmente en el front).
import { admin, CORS, json, miembroDesdeRequest } from '../_shared/comun.ts';
import {
  actualizarIssueLinear,
  conFirma,
  crearIssueLinear,
  ErrorLinear,
  guardarDesdeLinear,
  hijasDe,
  LABEL_LOOP,
  prefijoTitulo,
  type IssueLinear,
} from '../_shared/linear.ts';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const EQUIPOS = ['CS', 'Tech', 'Product'] as const;
const ESTADOS = ['Backlog', 'Todo', 'In Progress', 'In Review', 'Done', 'Canceled'] as const;
const ORIGENES = ['email', 'reunion', 'ticket', 'manual'] as const;
const MAX_SUB_ISSUES = 15;
const MAX_TITULO = 250;
const MAX_TEXTO = 20_000;

type Equipo = (typeof EQUIPOS)[number];
type Estado = (typeof ESTADOS)[number];

class ErrorPedido extends Error {}

const texto = (valor: unknown, max: number, campo: string, obligatorio = true): string => {
  const t = typeof valor === 'string' ? valor.trim() : '';
  if (obligatorio && !t) throw new ErrorPedido(`Falta ${campo}`);
  if (t.length > max) throw new ErrorPedido(`${campo} es demasiado largo`);
  return t;
};

const de = <T extends readonly string[]>(lista: T, valor: unknown, campo: string): T[number] => {
  if (!lista.includes(valor as string)) throw new ErrorPedido(`${campo} inválido`);
  return valor as T[number];
};

async function escuelaSincronizada(db: SupabaseClient, id: unknown) {
  const { data } = await db.from('escuelas').select('id, nombre, linear_alias, linear_label').eq('id', id).maybeSingle();
  if (!data) throw new ErrorPedido('No existe la escuela');
  if (!data.linear_alias) throw new ErrorPedido('Esta escuela no está conectada a Linear');
  return { ...data, prefijo: String(data.linear_alias).split(',')[0].trim().replace(/^~/, '') };
}

async function loopDelHub(db: SupabaseClient, id: unknown) {
  const { data } = await db.from('loops').select('id, escuela_id, linear_uuid').eq('id', id).maybeSingle();
  if (!data) throw new ErrorPedido('No existe el loop');
  if (!data.linear_uuid) throw new ErrorPedido('Este loop no está en Linear');
  return data;
}

async function issueDelHub(db: SupabaseClient, id: unknown) {
  const { data } = await db.from('issues').select('id, linear_uuid, equipo').eq('id', id).maybeSingle();
  if (!data) throw new ErrorPedido('No existe la issue');
  // Las importadas antes del espejo no tienen uuid: Linear acepta el identificador (CS-207) como id.
  return { ...data, enLinear: data.linear_uuid ?? data.id };
}

async function crearLoop(db: SupabaseClient, p: Record<string, unknown>) {
  const escuela = await escuelaSincronizada(db, p.escuela_id);
  const titulo = texto(p.titulo, MAX_TITULO, 'el título');
  const quePidio = texto(p.que_pidio, MAX_TEXTO, 'qué pidió la escuela');
  const origen = de(ORIGENES, p.origen ?? 'manual', 'origen');
  const subIssues = Array.isArray(p.sub_issues) ? p.sub_issues : [];
  if (subIssues.length > MAX_SUB_ISSUES) throw new ErrorPedido(`Máximo ${MAX_SUB_ISSUES} sub-issues`);
  const subs = subIssues.map((s: Record<string, unknown>) => ({
    titulo: texto(s?.titulo, MAX_TITULO, 'el título de una sub-issue'),
    descripcion: texto(s?.descripcion, MAX_TEXTO, 'la descripción', false),
    equipo: de(EQUIPOS, s?.equipo, 'equipo de una sub-issue') as Equipo,
  }));

  let ownerEmail: string | null = null;
  if (p.owner_id) {
    const { data } = await db.from('equipo').select('email').eq('id', p.owner_id).maybeSingle();
    ownerEmail = data?.email ?? null;
  }
  if (p.quien_espera) {
    const { data } = await db.from('contactos').select('id').eq('id', p.quien_espera).eq('escuela_id', escuela.id).maybeSingle();
    if (!data) throw new ErrorPedido('El contacto no es de esta escuela');
  }

  const padre = await crearIssueLinear({
    equipo: 'CS',
    titulo: prefijoTitulo(escuela.prefijo, titulo),
    descripcion: conFirma(quePidio),
    labels: [LABEL_LOOP, escuela.linear_label],
    asignadoEmail: ownerEmail,
  });
  const hijas: IssueLinear[] = [];
  for (const s of subs) {
    hijas.push(
      await crearIssueLinear({
        equipo: s.equipo,
        titulo: prefijoTitulo(escuela.prefijo, s.titulo),
        descripcion: conFirma(s.descripcion || quePidio),
        parentId: padre.id,
        labels: s.equipo === 'CS' ? [escuela.linear_label] : [],
        asignadoEmail: s.equipo === 'CS' ? ownerEmail : null,
      }),
    );
  }

  await guardarDesdeLinear(db, [padre, ...hijas]);
  const { data: loop } = await db.from('loops').select('id').eq('linear_uuid', padre.id).single();
  if (!loop) throw new Error('El loop se creó en Linear pero no se pudo guardar');
  await db
    .from('loops')
    .update({
      origen,
      origen_interaccion_id: p.origen_interaccion_id ?? null,
      quien_espera: p.quien_espera ?? null,
      owner_id: p.owner_id ?? null,
    })
    .eq('id', loop.id);
  return { loop_id: loop.id, url: padre.url, sub_issues: hijas.map((h) => h.identifier) };
}

async function crearIssue(db: SupabaseClient, p: Record<string, unknown>) {
  const escuela = await escuelaSincronizada(db, p.escuela_id);
  const equipo = de(EQUIPOS, p.equipo, 'equipo') as Equipo;
  const loop = p.loop_id ? await loopDelHub(db, p.loop_id) : null;
  if (loop && loop.escuela_id !== escuela.id) throw new ErrorPedido('El loop es de otra escuela');
  const issue = await crearIssueLinear({
    equipo,
    titulo: prefijoTitulo(escuela.prefijo, texto(p.titulo, MAX_TITULO, 'el título')),
    descripcion: conFirma(texto(p.descripcion, MAX_TEXTO, 'la descripción', false)),
    parentId: loop?.linear_uuid ?? null,
    labels: equipo === 'CS' ? [escuela.linear_label] : [],
  });
  const r = await guardarDesdeLinear(db, [issue]);
  return { issue_id: r.issues[0] ?? issue.identifier, url: issue.url };
}

async function cambiarEstado(db: SupabaseClient, p: Record<string, unknown>) {
  const issue = await issueDelHub(db, p.issue_id);
  const estado = de(ESTADOS, p.estado, 'estado') as Estado;
  const actualizada = await actualizarIssueLinear(issue.enLinear, { estado });
  await guardarDesdeLinear(db, [actualizada]);
  return { issue_id: issue.id };
}

async function ligarIssue(db: SupabaseClient, p: Record<string, unknown>) {
  const issue = await issueDelHub(db, p.issue_id);
  const loop = await loopDelHub(db, p.loop_id);
  const actualizada = await actualizarIssueLinear(issue.enLinear, { parentId: loop.linear_uuid });
  await guardarDesdeLinear(db, [actualizada]);
  return { issue_id: issue.id, loop_id: loop.id };
}

async function cerrarLoop(db: SupabaseClient, p: Record<string, unknown>) {
  const loop = await loopDelHub(db, p.loop_id);
  // Las tareas de CS se dan por hechas al responder; las de Tech/Product siguen su curso.
  const hijas = await hijasDe(loop.linear_uuid);
  const actualizadas: IssueLinear[] = [];
  for (const h of hijas) {
    if (h.team.key === 'CS' && !['completed', 'canceled'].includes(h.state.type)) {
      actualizadas.push(await actualizarIssueLinear(h.id, { estado: 'Done', equipoActual: 'CS' }));
    }
  }
  const padre = await actualizarIssueLinear(loop.linear_uuid, { estado: 'Done', equipoActual: 'CS' });
  await guardarDesdeLinear(db, [padre, ...actualizadas]);
  return { loop_id: loop.id };
}

const ACCIONES: Record<string, (db: SupabaseClient, p: Record<string, unknown>) => Promise<unknown>> = {
  crear_loop: crearLoop,
  crear_issue: crearIssue,
  cambiar_estado: cambiarEstado,
  ligar_issue: ligarIssue,
  cerrar_loop: cerrarLoop,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  const db = admin();
  if (!(await miembroDesdeRequest(db, req))) return json({ error: 'Tu cuenta no está en el equipo de CS.' }, 401);

  let p: Record<string, unknown>;
  try {
    p = await req.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }
  const accion = ACCIONES[String(p.accion)];
  if (!accion) return json({ error: 'Acción desconocida' }, 400);

  try {
    return json(await accion(db, p));
  } catch (e) {
    if (e instanceof ErrorPedido) return json({ error: e.message }, 400);
    console.error(e);
    if (e instanceof ErrorLinear) return json({ error: `No se pudo actualizar Linear (${e.message.replace(/^Linear: /, '')})` }, 502);
    return json({ error: 'No se pudo completar la acción' }, 500);
  }
});
