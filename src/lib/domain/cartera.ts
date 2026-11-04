import type { Escuela, HubData, Loop, Ticket } from '@/lib/types';
import { issueResuelta, loopVencido, ticketVencido } from '@/lib/domain/loops';
import { resumenHealth, type ResumenHealth } from '@/lib/domain/health';

export interface ResumenEscuela {
  escuela: Escuela;
  health: ResumenHealth;
  issuesAbiertas: number;
  loopsAbiertos: number;
  loopsListos: number;
  loopsVencidos: number;
  ticketsNuevos: number;
  ticketsVencidos: number;
  ticketsAbiertos: number;
  caida: boolean;
  prioritaria: boolean;
}

export function resumenEscuela(datos: HubData, escuela: Escuela, ahora = new Date()): ResumenEscuela {
  const loops = datos.loops.filter((l) => l.escuela_id === escuela.id);
  const tickets = datos.tickets.filter((t) => t.escuela_id === escuela.id);
  const issues = datos.issues.filter((i) => i.escuela_id === escuela.id);
  const health = resumenHealth(datos.snapshots.filter((s) => s.escuela_id === escuela.id));
  const loopsVencidos = loops.filter((l) => loopVencido(l, ahora)).length;
  const ticketsVencidos = tickets.filter((t) => ticketVencido(t, ahora)).length;

  return {
    escuela,
    health,
    issuesAbiertas: issues.filter((i) => !issueResuelta(i)).length,
    loopsAbiertos: loops.filter((l) => l.estado !== 'Closed').length,
    loopsListos: loops.filter((l) => l.estado === 'Ready to reply').length,
    loopsVencidos,
    ticketsNuevos: tickets.filter((t) => t.estado === 'Nuevo').length,
    ticketsVencidos,
    ticketsAbiertos: tickets.filter((t) => t.estado !== 'Resuelto').length,
    caida: health.caida,
    prioritaria: loopsVencidos + ticketsVencidos > 0,
  };
}

export function ordenarCartera(resumenes: ResumenEscuela[]): ResumenEscuela[] {
  return [...resumenes].sort((a, b) => {
    if (a.prioritaria !== b.prioritaria) return a.prioritaria ? -1 : 1;
    if (a.caida !== b.caida) return a.caida ? -1 : 1;
    return (a.health.total ?? 101) - (b.health.total ?? 101);
  });
}

export function loopsDeEscuela(datos: HubData, escuelaId: string): Loop[] {
  return datos.loops.filter((l) => l.escuela_id === escuelaId);
}

export function ticketsDeEscuela(datos: HubData, escuelaId: string): Ticket[] {
  return datos.tickets.filter((t) => t.escuela_id === escuelaId);
}

export function nombreEquipo(datos: HubData, id: string | null): string {
  return datos.equipo.find((m) => m.id === id)?.nombre ?? 'Sin owner';
}

export function rutaEscuela(escuela: Pick<Escuela, 'slug'>, pestana: string, extra: Record<string, string> = {}): string {
  return `/escuelas/${escuela.slug}?${new URLSearchParams({ tab: pestana, ...extra })}`;
}
