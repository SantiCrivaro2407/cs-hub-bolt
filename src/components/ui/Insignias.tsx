import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { EstadoIssue, EstadoLoop, EstadoTicket, Etapa } from '@/lib/types';
import { ETIQUETA_NIVEL, nivelHealth, type NivelHealth } from '@/lib/domain/health';

const CLASES_NIVEL: Record<NivelHealth, string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  risk: 'border-rose-200 bg-rose-50 text-rose-800',
};

const PUNTO_NIVEL: Record<NivelHealth, string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  risk: 'bg-rose-500',
};

export function HealthChip({ total, delta, conEtiqueta = false }: { total: number | null; delta: number | null; conEtiqueta?: boolean }) {
  if (total === null) return <span className="text-xs text-slate-500">Sin health</span>;
  const nivel = nivelHealth(total);
  const Flecha = delta === null || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${CLASES_NIVEL[nivel]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${PUNTO_NIVEL[nivel]}`} />
      Health {total}
      <Flecha className="h-3.5 w-3.5" aria-hidden />
      {conEtiqueta && <span className="font-normal">· {ETIQUETA_NIVEL[nivel]}</span>}
    </span>
  );
}

export function Pill({ children, tono = 'neutro' }: { children: React.ReactNode; tono?: 'neutro' | 'azul' | 'rojo' | 'verde' | 'ambar' }) {
  const clases = {
    neutro: 'border-slate-200 bg-slate-100 text-slate-700',
    azul: 'border-sky-200 bg-sky-50 text-sky-800',
    rojo: 'border-rose-200 bg-rose-50 text-rose-700',
    verde: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    ambar: 'border-amber-200 bg-amber-50 text-amber-900',
  }[tono];
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${clases}`}>{children}</span>;
}

export function EtapaBadge({ etapa }: { etapa: Etapa }) {
  const tono = etapa === 'Live' ? 'verde' : etapa === 'Piloto' ? 'azul' : 'ambar';
  return <Pill tono={tono}>{etapa}</Pill>;
}

const TONO_LOOP: Record<EstadoLoop, 'neutro' | 'azul' | 'ambar' | 'verde'> = {
  Open: 'azul',
  Waiting: 'ambar',
  'Ready to reply': 'verde',
  Closed: 'neutro',
};

export function EstadoLoopBadge({ estado, vencido = false }: { estado: EstadoLoop; vencido?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Pill tono={TONO_LOOP[estado]}>{estado}</Pill>
      {vencido && <Pill tono="rojo">Vencido</Pill>}
    </span>
  );
}

const TONO_TICKET: Record<EstadoTicket, 'rojo' | 'ambar' | 'verde'> = {
  Nuevo: 'rojo',
  'En curso': 'ambar',
  Resuelto: 'verde',
};

export function EstadoTicketBadge({ estado, vencido = false }: { estado: EstadoTicket; vencido?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Pill tono={TONO_TICKET[estado]}>{estado}</Pill>
      {vencido && <Pill tono="rojo">Vencido</Pill>}
    </span>
  );
}

export function EstadoIssueBadge({ estado }: { estado: EstadoIssue }) {
  const tono = estado === 'Done' ? 'verde' : estado === 'Canceled' ? 'neutro' : estado === 'Backlog' ? 'neutro' : 'azul';
  return <Pill tono={tono}>{estado}</Pill>;
}

export function Avatar({ iniciales, tamano = 'md' }: { iniciales: string; tamano?: 'md' | 'lg' }) {
  const clases = tamano === 'lg' ? 'h-14 w-14 text-lg' : 'h-10 w-10 text-sm';
  return (
    <div className={`flex ${clases} shrink-0 items-center justify-center rounded-xl bg-slate-900 font-semibold text-white`}>
      {iniciales}
    </div>
  );
}
