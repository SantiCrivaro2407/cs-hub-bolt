// Trae de Linear las issues y loops que cambiaron desde la última sync y los guarda en el hub.
//   POST con header x-cron-secret correcto → pg_cron, cada 15 min (respaldo del webhook).
//   POST con la sesión de un miembro del equipo → botón "Sincronizar ahora".
// La primera vez mira DIAS_PRIMERA_SYNC para atrás. Solo se guarda lo que es de una escuela con linear_alias.
import { admin, CORS, env, json, miembroDesdeRequest, secretoValido } from '../_shared/comun.ts';
import { CAMPOS_ISSUE, guardarDesdeLinear, linear, type IssueLinear } from '../_shared/linear.ts';

const DIAS_PRIMERA_SYNC = 180;
const MAX_PAGINAS = 30;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  const db = admin();

  const esCron = secretoValido(req.headers.get('x-cron-secret'), env('CRON_SECRET'));
  if (!esCron && !(await miembroDesdeRequest(db, req))) return json({ error: 'No autorizado' }, 401);

  const inicio = new Date();
  const { data: estado } = await db.from('linear_sync').select('ultima_sync').eq('id', 1).maybeSingle();
  // Una hora de solapamiento por si algo llegó con demora; guardar es idempotente.
  const desde = estado?.ultima_sync
    ? new Date(new Date(estado.ultima_sync).getTime() - 60 * 60 * 1000)
    : new Date(Date.now() - DIAS_PRIMERA_SYNC * 24 * 60 * 60 * 1000);

  try {
    const nodos: IssueLinear[] = [];
    let cursor: string | null = null;
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
      const data: { issues: { nodes: IssueLinear[]; pageInfo: { hasNextPage: boolean; endCursor: string } } } = await linear(
        `query($desde: DateTimeOrDuration!, $after: String) {
           issues(first: 100, after: $after, orderBy: updatedAt,
                  filter: { updatedAt: { gt: $desde }, team: { key: { in: ["CS", "TECH", "PRO"] } } }) {
             nodes { ${CAMPOS_ISSUE} }
             pageInfo { hasNextPage endCursor }
           }
         }`,
        { desde: desde.toISOString(), after: cursor },
      );
      nodos.push(...data.issues.nodes);
      if (!data.issues.pageInfo.hasNextPage) break;
      cursor = data.issues.pageInfo.endCursor;
    }

    const { loops, issues } = await guardarDesdeLinear(db, nodos);
    await db.from('linear_sync').update({ ultima_sync: inicio.toISOString(), ultimo_error: null }).eq('id', 1);
    return json({ revisadas: nodos.length, loops: loops.length, issues: issues.length });
  } catch (e) {
    const mensaje = String(e instanceof Error ? e.message : e).slice(0, 300);
    console.error(e);
    await db.from('linear_sync').update({ ultimo_error: mensaje }).eq('id', 1);
    return json({ error: mensaje }, 500);
  }
});
