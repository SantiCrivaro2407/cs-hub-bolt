import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { HealthGrafico } from '@/components/escuela/HealthGrafico';
import { HealthChip } from '@/components/ui/Insignias';
import { Boton } from '@/components/ui/Boton';
import { useHub } from '@/context/HubContext';
import { useToast } from '@/context/ToastContext';
import { CATEGORIAS_HEALTH, formatoDelta, nivelHealth, resumenHealth, type CategoriaKey } from '@/lib/domain/health';
import type { Escuela, HealthMetricas, HealthSnapshot } from '@/lib/types';

const CLASE_NIVEL = {
  ok: 'text-emerald-700',
  warn: 'text-amber-700',
  risk: 'text-rose-700',
} as const;

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
    case 'resultados':
      return `${m.resultados.evolution_reports} Evolution Reports generados`;
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
    case 'resultados': {
      const d = m.resultados.distribucion;
      return [
        ['Evolution Reports generados', String(m.resultados.evolution_reports)],
        ['Alumnos con Evolution Report', String(m.resultados.alumnos_con_evolution)],
        ['Distribución', `Unseen ${d.unseen} · Forming ${d.forming} · Struggling ${d.struggling} · Mixed ${d.mixed} · Growing ${d.growing}`],
      ];
    }
  }
}

function TarjetaCategoria({
  etiqueta,
  clave,
  actual,
  referencia,
}: {
  etiqueta: string;
  clave: CategoriaKey;
  actual: HealthSnapshot;
  referencia: HealthSnapshot | null;
}) {
  const [abierta, setAbierta] = useState(false);
  const puntaje = actual[clave];
  const delta = referencia ? puntaje - referencia[clave] : null;
  const nivel = nivelHealth(puntaje);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{etiqueta}</p>
          <p className={`mt-1 text-3xl font-semibold ${CLASE_NIVEL[nivel]}`}>
            {puntaje}
            <span className="text-base font-normal text-slate-400"> /100</span>
          </p>
        </div>
        <span className="text-xs text-slate-500">{delta === null ? 'Sin referencia' : formatoDelta(delta)}</span>
      </div>
      <p className="mt-3 text-sm text-slate-700">{resumenCategoria(clave, actual.metricas)}</p>
      <Boton variante="fantasma" onClick={() => setAbierta(!abierta)} className="mt-3 -ml-3 px-3 py-1.5 text-xs">
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${abierta ? 'rotate-180' : ''}`} />
        {abierta ? 'Ocultar detalle' : 'Ver detalle'}
      </Boton>
      {abierta && (
        <dl className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
          {detalleCategoria(clave, actual.metricas).map(([nombre, valor]) => (
            <div key={nombre} className="flex justify-between gap-4 py-2 text-sm">
              <dt className="text-slate-600">{nombre}</dt>
              <dd className="text-right font-medium text-slate-900">{valor}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}

export function HealthTab({ escuela }: { escuela: Escuela }) {
  const { datos } = useHub();
  const { mostrar } = useToast();
  const resumen = resumenHealth(datos.snapshots.filter((s) => s.escuela_id === escuela.id));
  const actual = resumen.actual;

  if (!actual || resumen.total === null) {
    return <p className="text-sm text-slate-500">Todavía no hay mediciones de health para esta escuela.</p>;
  }

  const nivel = nivelHealth(resumen.total);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Health score</p>
          <p className={`text-4xl font-semibold ${CLASE_NIVEL[nivel]}`}>{resumen.total}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <HealthChip total={resumen.total} delta={resumen.delta} conEtiqueta />
          <span className="text-sm text-slate-600">{formatoDelta(resumen.delta)}</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="mb-3 text-sm font-medium text-slate-700">Últimas 8 semanas</p>
        <HealthGrafico historia={resumen.historia} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CATEGORIAS_HEALTH.map((c) => (
          <TarjetaCategoria key={c.key} etiqueta={c.label} clave={c.key} actual={actual} referencia={resumen.referencia} />
        ))}
      </div>

      <p className="text-xs text-slate-500">
        Cada categoría pesa lo mismo. Verde ≥ 70, amarillo 50–69, rojo &lt; 50. Loops y último contacto no entran al score.
      </p>
      <div>
        <Boton onClick={() => mostrar(`Abriendo la instancia de ${escuela.nombre} (simulado)`)}>Abrir instancia de la escuela</Boton>
      </div>
    </div>
  );
}
