import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { EstadoIssue, EstadoLoop, EstadoTicket, Etapa } from '@/lib/types';
import { ETIQUETA_NIVEL, nivelHealth, type NivelHealth } from '@/lib/domain/health';

const CLASES_NIVEL: Record<NivelHealth, string> = {
  ok: 'border-transparent bg-triage-progressing text-triage-progressing-fg',
  warn: 'border-transparent bg-triage-watch text-triage-watch-fg',
  risk: 'border-transparent bg-triage-support text-triage-support-fg',
};

const PUNTO_NIVEL: Record<NivelHealth, string> = {
  ok: 'bg-success',
  warn: 'bg-warning',
  risk: 'bg-destructive',
};

export function HealthChip({ total, delta, conEtiqueta = false }: { total: number | null; delta: number | null; conEtiqueta?: boolean }) {
  if (total === null) return <span className="text-xs text-muted-foreground">Sin health</span>;
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
  // Estados suaves con la paleta triage del design system (igual que cs-hub-mvp).
  const clases = {
    neutro: 'bg-triage-none text-triage-none-fg',
    azul: 'bg-triage-insufficient text-triage-insufficient-fg',
    rojo: 'bg-triage-support text-triage-support-fg',
    verde: 'bg-triage-progressing text-triage-progressing-fg',
    ambar: 'bg-triage-watch text-triage-watch-fg',
  }[tono];
  return <span className={`inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${clases}`}>{children}</span>;
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

// Sin logos reales: iniciales sobre un tinte suave del design system.
const TINTES_AVATAR = ['bg-tutorial-getting-started', 'bg-tutorial-observations', 'bg-tutorial-reports', 'bg-tutorial-admin-workflows'];

export function Avatar({ iniciales, tamano = 'md' }: { iniciales: string; tamano?: 'md' | 'lg' }) {
  const tinte = TINTES_AVATAR[[...iniciales].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTES_AVATAR.length];
  const clases = tamano === 'lg' ? 'h-12 w-12 text-base' : 'h-11 w-11 text-sm';
  return (
    <div aria-hidden className={`flex ${clases} shrink-0 items-center justify-center rounded-xl font-semibold text-foreground/80 ${tinte}`}>
      {iniciales}
    </div>
  );
}
