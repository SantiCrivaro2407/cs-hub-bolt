import type { EstadoIssue, EstadoLoop, Issue, Loop, OrigenLoop, Ticket } from '@/lib/types';
import { diasHabilesEntre } from '@/lib/domain/dates';
import { HOSTS_LINEAR, urlSegura } from '@/lib/domain/urls';

export const ESTADOS_ISSUE: EstadoIssue[] = ['Backlog', 'Todo', 'In Progress', 'In Review', 'Done', 'Canceled'];

export const ORDEN_ESTADO_LOOP: Record<EstadoLoop, number> = {
  'Ready to reply': 0,
  Waiting: 1,
  Open: 2,
  Closed: 3,
};

export const ETIQUETA_ORIGEN: Record<OrigenLoop, string> = {
  email: 'Desde un email',
  reunion: 'Desde un action item de reunión',
  ticket: 'Desde un ticket Talk with us',
  manual: 'Creado a mano',
};

export function issueResuelta(issue: Pick<Issue, 'estado'>): boolean {
  return issue.estado === 'Done' || issue.estado === 'Canceled';
}

export function estadoDerivadoLoop(issuesLigadas: Pick<Issue, 'estado'>[]): EstadoLoop {
  if (issuesLigadas.length === 0) return 'Open';
  if (issuesLigadas.every(issueResuelta)) return 'Ready to reply';
  return 'Waiting';
}

export function loopVencido(loop: Pick<Loop, 'estado' | 'creado'>, ahora = new Date()): boolean {
  if (loop.estado !== 'Open' && loop.estado !== 'Waiting') return false;
  return diasHabilesEntre(loop.creado, ahora) > 5;
}

export function ticketVencido(ticket: Pick<Ticket, 'estado' | 'creado'>, ahora = new Date()): boolean {
  if (ticket.estado !== 'Nuevo') return false;
  return diasHabilesEntre(ticket.creado, ahora) > 1;
}

export function contarResueltas(issuesLigadas: Pick<Issue, 'estado'>[]): number {
  return issuesLigadas.filter(issueResuelta).length;
}

export function ordenarLoops<T extends Pick<Loop, 'estado' | 'creado'>>(loops: T[]): T[] {
  return [...loops].sort((a, b) => {
    const porEstado = ORDEN_ESTADO_LOOP[a.estado] - ORDEN_ESTADO_LOOP[b.estado];
    if (porEstado !== 0) return porEstado;
    return a.creado.localeCompare(b.creado);
  });
}

export function siguienteIdLoop(codigoEscuela: string, idsExistentes: string[]): string {
  const prefijo = `L-${codigoEscuela}-`;
  const numeros = idsExistentes
    .filter((id) => id.startsWith(prefijo))
    .map((id) => Number(id.slice(prefijo.length)))
    .filter((n) => !Number.isNaN(n));
  const siguiente = (numeros.length ? Math.max(...numeros) : 0) + 1;
  return `${prefijo}${String(siguiente).padStart(2, '0')}`;
}

export function siguienteIdIssue(prefijo: string, issues: Pick<Issue, 'id'>[]): string {
  const cabecera = `${prefijo}-`;
  const numeros = issues
    .filter((issue) => issue.id.startsWith(cabecera))
    .map((issue) => Number(issue.id.slice(cabecera.length)))
    .filter((n) => !Number.isNaN(n));
  const base = prefijo === 'TECH' ? 1800 : 180;
  const siguiente = Math.max(base, ...numeros) + 1;
  return `${cabecera}${siguiente}`;
}

// Workspace de Linear de Volantis; se puede pisar con VITE_LINEAR_URL.
const LINEAR_URL = (import.meta.env.VITE_LINEAR_URL as string | undefined) ?? 'https://linear.app/volantis-education';

/** Link a Linear de una issue o de un loop (los loops también son issues de Linear). */
export function urlLinear(item: Pick<Issue | Loop, 'id' | 'url'>): string {
  return urlSegura(item.url, HOSTS_LINEAR) ?? `${LINEAR_URL}/issue/${encodeURIComponent(item.id)}`;
}
