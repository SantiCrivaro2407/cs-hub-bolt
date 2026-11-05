import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Avatar } from '@/components/ui/Insignias';
import { Enlace } from '@/components/ui/Enlace';
import { TONO_HEALTH, tonoHealth } from '@/components/ui/HealthGauge';
import { useHub } from '@/context/HubContext';
import type { ResumenEscuela } from '@/lib/domain/cartera';
import { pendientesEscuela } from '@/lib/domain/pendientes';

const TENDENCIA = {
  sube: { Icono: ArrowUpRight, etiqueta: 'Sube', clase: 'text-triage-progressing-fg' },
  baja: { Icono: ArrowDownRight, etiqueta: 'Baja', clase: 'text-triage-support-fg' },
  estable: { Icono: ArrowRight, etiqueta: 'Estable', clase: 'text-muted-foreground' },
};

/** Tarjeta de la home: tinte según el health y las métricas clave. El detalle por estándar vive en Health. */
export function TarjetaEscuela({ resumen }: { resumen: ResumenEscuela }) {
  const { datos } = useHub();
  const { escuela, health } = resumen;
  const pendientes = pendientesEscuela(datos, escuela);
  const tono = TONO_HEALTH[tonoHealth(health.total)];
  const tendencia = TENDENCIA[health.delta === null || health.delta === 0 ? 'estable' : health.delta > 0 ? 'sube' : 'baja'];

  return (
    <Enlace href={`/escuelas/${escuela.slug}`} className={`group relative flex flex-col gap-4 rounded-2xl border p-5 shadow-xs hover:shadow-md ${tono.tarjeta}`}>
      <GloboPendientes textos={pendientes.map((p) => p.texto)} />
      <div className="flex items-start justify-between gap-3">
        <Avatar iniciales={escuela.iniciales} />
        <span className="rounded-full bg-card/70 px-2 py-0.5 text-xs text-muted-foreground">{escuela.etapa}</span>
      </div>

      <div className="truncate text-base font-medium group-hover:underline">{escuela.nombre}</div>

      <div className="flex items-end justify-between gap-3 border-t border-foreground/10 pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Health</span>
          <span className="flex items-center gap-1.5 text-lg font-semibold tabular-nums">
            <span className={`h-2 w-2 rounded-full ${tono.punto}`} />
            {health.total ?? '–'}
            {health.total !== null && <tendencia.Icono className={`h-4 w-4 ${tendencia.clase}`} aria-label={tendencia.etiqueta} />}
          </span>
        </div>
        <ul className="flex flex-col items-end gap-0.5 text-right text-sm">
          <Pendiente cantidad={resumen.issuesAbiertas} singular="issue abierta" plural="issues abiertas" />
          <Pendiente cantidad={resumen.loopsAbiertos} singular="loop abierto" plural="loops abiertos" />
        </ul>
      </div>
    </Enlace>
  );
}

// Como las notificaciones del celular: solo aparece si hay algo que requiere atención.
function GloboPendientes({ textos }: { textos: string[] }) {
  if (textos.length === 0) return null;
  const etiqueta = `${textos.length} ${textos.length === 1 ? 'pendiente' : 'pendientes'}`;
  return (
    <span
      title={textos.join('\n')}
      aria-label={etiqueta}
      className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-triage-watch px-1.5 text-xs font-semibold tabular-nums text-triage-watch-fg shadow-sm ring-2 ring-background"
    >
      {textos.length > 9 ? '9+' : textos.length}
    </span>
  );
}

// En 0 se apaga, así resaltan las escuelas con algo pendiente.
function Pendiente({ cantidad, singular, plural }: { cantidad: number; singular: string; plural: string }) {
  return (
    <li className={`whitespace-nowrap ${cantidad === 0 ? 'text-muted-foreground/70' : 'text-foreground'}`}>
      <span className="font-semibold tabular-nums">{cantidad}</span> {cantidad === 1 ? singular : plural}
    </li>
  );
}
