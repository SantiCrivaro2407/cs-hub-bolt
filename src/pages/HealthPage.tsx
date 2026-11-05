import { useMemo } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Avatar } from '@/components/ui/Insignias';
import { Enlace } from '@/components/ui/Enlace';
import { HealthGauge, TONO_HEALTH, tonoHealth } from '@/components/ui/HealthGauge';
import { useHub } from '@/context/HubContext';
import { ordenarCartera, resumenEscuela, rutaEscuela, type ResumenEscuela } from '@/lib/domain/cartera';
import { CATEGORIAS_HEALTH } from '@/lib/domain/health';

function Tendencia({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) return <ArrowRight className="h-4 w-4 text-muted-foreground" aria-label="Estable" />;
  return delta > 0 ? (
    <ArrowUpRight className="h-4 w-4 text-triage-progressing-fg" aria-label="Sube" />
  ) : (
    <ArrowDownRight className="h-4 w-4 text-triage-support-fg" aria-label="Baja" />
  );
}

const COLUMNAS = 'md:grid-cols-[minmax(0,1fr)_88px_repeat(4,96px)]';

/** Una fila por escuela con el total y un arco por estándar. */
function ListaCartera({ resumenes }: { resumenes: ResumenEscuela[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className={`hidden items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid ${COLUMNAS}`}>
        <span>Escuela</span>
        <span className="text-center">Health</span>
        {CATEGORIAS_HEALTH.map((c) => (
          <span key={c.key} className="truncate text-center" title={c.label}>
            {c.label}
          </span>
        ))}
      </div>
      <ul className="divide-y divide-border">
        {resumenes.map(({ escuela, health }) => (
          <li key={escuela.id}>
            <Enlace href={rutaEscuela(escuela, 'health')} className={`grid grid-cols-4 items-center gap-x-2 gap-y-3 px-4 py-3 hover:bg-accent/50 ${COLUMNAS}`}>
              <div className="col-span-3 flex min-w-0 items-center gap-3 md:col-span-1">
                <Avatar iniciales={escuela.iniciales} />
                <div className="min-w-0">
                  <div className="truncate font-medium">{escuela.nombre}</div>
                  <div className="text-xs text-muted-foreground">
                    {escuela.slug} · {escuela.etapa}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-1 md:justify-center">
                <span className={`text-2xl font-semibold tabular-nums ${TONO_HEALTH[tonoHealth(health.total)].texto}`}>{health.total ?? '–'}</span>
                {health.total !== null && <Tendencia delta={health.delta} />}
              </div>
              {CATEGORIAS_HEALTH.map((c) => {
                const valor = health.actual ? health.actual[c.key] : null;
                const previo = health.referencia ? health.referencia[c.key] : null;
                return (
                  <div key={c.key} className="flex flex-col items-center">
                    <span className="mb-1 text-[11px] text-muted-foreground md:hidden">{c.label}</span>
                    <HealthGauge valor={valor} titulo={c.label} delta={valor !== null && previo !== null ? valor - previo : null} />
                  </div>
                );
              })}
            </Enlace>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HealthPage() {
  const { datos } = useHub();
  const resumenes = useMemo(() => ordenarCartera(datos.escuelas.map((e) => resumenEscuela(datos, e))), [datos]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl">Health</h1>
        <p className="mt-1 text-sm text-muted-foreground">Actividad, Engagement, Calidad y Cobertura de cada escuela. Primero las que necesitan atención.</p>
      </div>
      <ListaCartera resumenes={resumenes} />
    </div>
  );
}
