import { nivelHealth, type NivelHealth } from '@/lib/domain/health';

type TonoHealth = NivelHealth | 'sin-datos';

// Niveles de health sobre la paleta triage del design system (igual que cs-hub-mvp).
export const TONO_HEALTH: Record<TonoHealth, { texto: string; trazo: string; punto: string; tarjeta: string }> = {
  ok: {
    texto: 'text-triage-progressing-fg',
    trazo: 'text-triage-progressing-fg',
    punto: 'bg-success',
    tarjeta: 'border-triage-progressing bg-triage-progressing/35 hover:border-triage-progressing-fg/40',
  },
  warn: {
    texto: 'text-triage-watch-fg',
    trazo: 'text-triage-watch-strong',
    punto: 'bg-warning',
    tarjeta: 'border-triage-watch bg-triage-watch/45 hover:border-triage-watch-fg/40',
  },
  risk: {
    texto: 'text-triage-support-fg',
    trazo: 'text-triage-support-strong',
    punto: 'bg-destructive',
    tarjeta: 'border-triage-support bg-triage-support/30 hover:border-triage-support-fg/40',
  },
  'sin-datos': {
    texto: 'text-muted-foreground',
    trazo: 'text-triage-none-strong',
    punto: 'bg-triage-none-strong',
    tarjeta: 'border-border bg-card hover:border-foreground/20',
  },
};

export function tonoHealth(valor: number | null): TonoHealth {
  return valor === null ? 'sin-datos' : nivelHealth(valor);
}

const RADIO = 22;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;
const ARCO = CIRCUNFERENCIA * 0.75;

/** Arco de 270° estilo "detalle de atributos" con el valor en el centro. */
export function HealthGauge({
  valor,
  etiqueta,
  titulo,
  delta,
  tamano = 'md',
}: {
  valor: number | null;
  etiqueta?: string;
  titulo: string;
  delta?: number | null;
  tamano?: 'md' | 'lg';
}) {
  const tono = TONO_HEALTH[tonoHealth(valor)];
  const relleno = valor === null ? 0 : (ARCO * Math.max(0, Math.min(100, valor))) / 100;

  return (
    <div className="flex flex-col items-center gap-1" title={`${titulo}: ${valor ?? 'sin datos'}`}>
      {etiqueta && <span className="whitespace-nowrap text-xs font-medium uppercase tracking-caps text-muted-foreground">{etiqueta}</span>}
      <div className={`relative ${tamano === 'lg' ? 'h-[72px] w-[72px]' : 'h-14 w-14'}`}>
        <svg viewBox="0 0 56 56" className="h-full w-full" aria-hidden>
          <circle
            cx="28"
            cy="28"
            r={RADIO}
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${ARCO} ${CIRCUNFERENCIA}`}
            transform="rotate(135 28 28)"
            className="stroke-foreground/10"
          />
          <circle
            cx="28"
            cy="28"
            r={RADIO}
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${relleno} ${CIRCUNFERENCIA}`}
            transform="rotate(135 28 28)"
            className={`${tono.trazo} transition-[stroke-dasharray] duration-500`}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center font-heading font-semibold tabular-nums ${tamano === 'lg' ? 'text-lg' : 'text-base'} ${tono.texto}`}>
          {valor ?? '–'}
        </span>
      </div>
      {delta !== undefined && <DeltaMini delta={delta} />}
    </div>
  );
}

function DeltaMini({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-xs text-muted-foreground">·</span>;
  const clase = delta > 0 ? 'text-triage-progressing-fg' : delta < 0 ? 'text-triage-support-fg' : 'text-muted-foreground';
  return <span className={`text-xs font-medium tabular-nums ${clase}`}>{delta > 0 ? `+${delta}` : delta < 0 ? `−${Math.abs(delta)}` : '='}</span>;
}
