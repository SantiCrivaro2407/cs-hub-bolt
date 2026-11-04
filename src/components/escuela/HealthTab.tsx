import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { HealthGrafico } from '@/components/escuela/HealthGrafico';
import { LeyendaHealth } from '@/components/health/LeyendaHealth';
import { SelectorVista, useVistaHealth } from '@/components/health/VistaHealth';
import { HealthChip } from '@/components/ui/Insignias';
import { Boton } from '@/components/ui/Boton';
import { HealthGauge, TONO_HEALTH, tonoHealth } from '@/components/ui/HealthGauge';
import { useHub } from '@/context/HubContext';
import { useToast } from '@/context/ToastContext';
import { fechaCorta } from '@/lib/domain/dates';
import { CATEGORIAS_HEALTH, formatoDelta, resumenHealth, type CategoriaKey } from '@/lib/domain/health';
import type { Escuela, HealthMetricas, HealthSnapshot } from '@/lib/types';

function porcentaje(parte: number, total: number): number {
  return total === 0 ? 0 : Math.round((parte / total) * 100);
}

function resumenCategoria(clave: CategoriaKey, m: HealthMetricas): string {
  switch (clave) {
    case 'activacion':
      return `${m.activacion.invitaciones_vencidas} de ${m.activacion.docentes_invitados} · ${porcentaje(m.activacion.invitaciones_vencidas, m.activacion.docentes_invitados)}% invitaciones vencidas`;
    case 'engagement':
      return `${m.engagement.uso_semana_pct}% de uso esta semana`;
    case 'calidad':
      return `${m.calidad.calidad_promedio}/100 calidad promedio`;
    case 'cobertura':
      return `${m.cobertura.curriculo_cubierto_pct}% del currículo cubierto`;
  }
}

function detalleCategoria(clave: CategoriaKey, m: HealthMetricas): [string, string][] {
  switch (clave) {
    case 'activacion':
      return [
        ['Invitaciones vencidas', `${m.activacion.invitaciones_vencidas} de ${m.activacion.docentes_invitados} · ${porcentaje(m.activacion.invitaciones_vencidas, m.activacion.docentes_invitados)}%`],
        ['Bloqueos de setup', String(m.activacion.bloqueos_setup)],
      ];
    case 'engagement':
      return [
        ['Docentes activos', `${m.engagement.docentes_activos} de ${m.engagement.docentes_total}`],
        ['Uso de la semana', `${m.engagement.uso_semana_pct}% vs ${m.engagement.uso_semana_anterior_pct}% la semana anterior`],
        ['Observaciones de la semana', String(m.engagement.observaciones_semana)],
        ['Observaciones por docente', m.engagement.observaciones_por_docente.toFixed(1)],
        ['Docentes con 3+ observaciones', String(m.engagement.docentes_3_mas_obs)],
        ['Docentes en riesgo', String(m.engagement.docentes_en_riesgo)],
      ];
    case 'calidad':
      return [
        ['Calidad promedio', `${m.calidad.calidad_promedio}/100`],
        ['Docentes activos con calidad 70+', String(m.calidad.docentes_70_mas)],
        ['Matches curriculares por observación', m.calidad.matches_por_obs.toFixed(1)],
        ['Personalización', `${m.calidad.personalizacion_pct}%`],
      ];
    case 'cobertura':
      return [
        ['Alumnos observados en 15 días', `${m.cobertura.alumnos_observados_15d} de ${m.cobertura.alumnos_total}`],
        ['Currículo cubierto', `${m.cobertura.curriculo_cubierto_pct}%`],
      ];
  }
}

/** Vista lista: una fila por estándar con su arco, el resumen y el detalle desplegable. */
function FilaEstandar({ etiqueta, clave, actual, referencia }: { etiqueta: string; clave: CategoriaKey; actual: HealthSnapshot; referencia: HealthSnapshot | null }) {
  const [abierta, setAbierta] = useState(false);
  const puntaje = actual[clave];
  const delta = referencia ? puntaje - referencia[clave] : null;

  return (
    <li className="px-4 py-4">
      <div className="flex items-center gap-4">
        <HealthGauge valor={puntaje} titulo={etiqueta} tamano="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="text-base">{etiqueta}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{resumenCategoria(clave, actual.metricas)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{delta === null ? 'Sin referencia' : formatoDelta(delta)}</p>
        </div>
        <Boton variante="fantasma" onClick={() => setAbierta(!abierta)} className="shrink-0 px-2.5 py-1.5 text-xs" aria-expanded={abierta}>
          <span className="hidden sm:inline">{abierta ? 'Ocultar detalle' : 'Ver detalle'}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${abierta ? 'rotate-180' : ''}`} />
        </Boton>
      </div>
      {abierta && (
        <dl className="mt-3 divide-y divide-border border-t border-border sm:ml-[88px]">
          {detalleCategoria(clave, actual.metricas).map(([nombre, valor]) => (
            <div key={nombre} className="flex justify-between gap-4 py-2 text-sm">
              <dt className="text-muted-foreground">{nombre}</dt>
              <dd className="text-right font-medium tabular-nums">{valor}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

/** Vista canvas: estándar × semana, un cuadradito por medición. */
function CanvasEstandares({ historia }: { historia: HealthSnapshot[] }) {
  const semanas = historia.slice(-8);
  const ultima = semanas.length - 1;
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card p-4">
      <div className="grid w-max grid-cols-[120px_repeat(8,56px)] gap-1.5 sm:grid-cols-[140px_repeat(8,64px)]">
        <span />
        {semanas.map((s, i) => (
          <span key={s.id} className="pb-1 text-center text-xs text-muted-foreground">
            {i === ultima ? 'Hoy' : fechaCorta(s.fecha)}
          </span>
        ))}
        {CATEGORIAS_HEALTH.map((c) => (
          <FilaCanvas key={c.key} etiqueta={c.label} valores={semanas.map((s) => s[c.key])} />
        ))}
      </div>
      <LeyendaHealth />
    </div>
  );
}

function FilaCanvas({ etiqueta, valores }: { etiqueta: string; valores: number[] }) {
  return (
    <>
      <span className="flex items-center text-sm font-medium">{etiqueta}</span>
      {valores.map((v, i) => (
        <span
          key={i}
          title={`${etiqueta}: ${v}`}
          className={`flex aspect-square items-center justify-center rounded-md text-sm font-semibold tabular-nums ${TONO_HEALTH[tonoHealth(v)].celda}`}
        >
          {v}
        </span>
      ))}
    </>
  );
}

export function HealthTab({ escuela }: { escuela: Escuela }) {
  const { datos } = useHub();
  const { mostrar } = useToast();
  const [vista, setVista] = useVistaHealth();
  const resumen = resumenHealth(datos.snapshots.filter((s) => s.escuela_id === escuela.id));
  const actual = resumen.actual;

  if (!actual || resumen.total === null) {
    return <p className="text-sm text-muted-foreground">Todavía no hay mediciones de health para esta escuela.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Health score</p>
          <p className={`text-3xl font-semibold tabular-nums ${TONO_HEALTH[tonoHealth(resumen.total)].texto}`}>{resumen.total}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <HealthChip total={resumen.total} delta={resumen.delta} conEtiqueta />
          <span className="text-sm text-muted-foreground">{formatoDelta(resumen.delta)}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-3 text-sm font-medium">Últimas 8 semanas</p>
        <HealthGrafico historia={resumen.historia} />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg">Estándares</h2>
          <SelectorVista vista={vista} onCambiar={setVista} />
        </div>
        {vista === 'lista' ? (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {CATEGORIAS_HEALTH.map((c) => (
              <FilaEstandar key={c.key} etiqueta={c.label} clave={c.key} actual={actual} referencia={resumen.referencia} />
            ))}
          </ul>
        ) : (
          <CanvasEstandares historia={resumen.historia} />
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Cuatro estándares que pesan lo mismo: Actividad, Engagement, Calidad y Cobertura. Verde ≥ 70, amarillo 50–69, rojo &lt; 50. Loops y último
        contacto no entran al score.
      </p>
      <div>
        <Boton onClick={() => mostrar(`Abriendo la instancia de ${escuela.nombre} (simulado)`)}>Abrir instancia de la escuela</Boton>
      </div>
    </div>
  );
}
