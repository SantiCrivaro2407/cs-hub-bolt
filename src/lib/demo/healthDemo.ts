import { CATEGORIAS_HEALTH } from '@/lib/domain/health';
import type { EscuelaDemo } from '@/lib/demo/escuelasDemo';
import type { HealthMetricas } from '@/lib/types';

const EDADES_EN_DIAS = [49, 42, 35, 28, 21, 14, 7, 0];
const AJUSTE_CATEGORIA = [4, -6, 3, -2, 1];

function totalEnEdad(e: EscuelaDemo, edad: number): number {
  const { actual, hace15 } = e.health;
  if (edad <= 14) return actual + ((hace15 - actual) * edad) / 14;
  return hace15 + ((edad % 3) - 1);
}

function metricasDemo(e: EscuelaDemo, puntajes: number[]): HealthMetricas {
  const [activacion, engagement, calidad, cobertura, resultados] = puntajes;
  const docentes = e.docentes;
  const docentesActivos = Math.round((docentes * engagement) / 100);
  const observaciones = Math.round((docentes * engagement) / 12);
  const alumnos = docentes * 11;
  const noEvolucionados = 100 - resultados;
  const unseen = Math.round((alumnos * noEvolucionados) / 100 * 0.3);
  const struggling = Math.round((alumnos * noEvolucionados) / 100 * 0.2);
  const forming = Math.round((alumnos * noEvolucionados) / 100 * 0.5);
  const mixed = Math.round((alumnos * resultados) / 100 * 0.5);
  const growing = Math.max(0, alumnos - unseen - struggling - forming - mixed);

  return {
    activacion: {
      docentes_invitados: docentes,
      invitaciones_vencidas: Math.round((docentes * (100 - activacion)) / 100 * 0.35),
      bloqueos_setup: Math.round((100 - activacion) / 20),
    },
    engagement: {
      docentes_total: docentes,
      docentes_activos: docentesActivos,
      uso_semana_pct: engagement,
      uso_semana_anterior_pct: Math.max(0, engagement - 4),
      observaciones_semana: observaciones,
      observaciones_por_docente: Math.round((observaciones / Math.max(1, docentesActivos)) * 10) / 10,
      docentes_3_mas_obs: Math.round(docentesActivos * 0.45),
      docentes_en_riesgo: docentes - docentesActivos,
    },
    calidad: {
      calidad_promedio: calidad,
      docentes_70_mas: Math.round((docentesActivos * calidad) / 100),
      matches_por_obs: Math.round((calidad / 25) * 10) / 10,
      personalizacion_pct: Math.max(0, calidad - 12),
    },
    cobertura: {
      alumnos_total: alumnos,
      alumnos_observados_15d: Math.round((alumnos * cobertura) / 100),
      curriculo_cubierto_pct: cobertura,
    },
    resultados: {
      evolution_reports: Math.round((alumnos * resultados) / 200),
      alumnos_con_evolution: Math.round((alumnos * resultados * 0.8) / 100),
      distribucion: { unseen, forming, struggling, mixed, growing },
    },
  };
}

function fechaLocal(diasAtras: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - diasAtras);
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export interface FilaHealthDemo {
  id: string;
  escuela_id: string;
  fecha: string;
  activacion: number;
  engagement: number;
  calidad: number;
  cobertura: number;
  resultados: number;
  metricas: HealthMetricas;
}

export function healthDemo(e: EscuelaDemo, escuelaId: string, nuevoId: () => string): FilaHealthDemo[] {
  return EDADES_EN_DIAS.map((edad) => {
    const total = totalEnEdad(e, edad);
    const puntajes = AJUSTE_CATEGORIA.map((ajuste) => Math.min(100, Math.max(0, Math.round(total + ajuste))));
    const valores = Object.fromEntries(CATEGORIAS_HEALTH.map((c, i) => [c.key, puntajes[i]]));
    return {
      id: nuevoId(),
      escuela_id: escuelaId,
      fecha: fechaLocal(edad),
      activacion: valores.activacion,
      engagement: valores.engagement,
      calidad: valores.calidad,
      cobertura: valores.cobertura,
      resultados: valores.resultados,
      metricas: metricasDemo(e, puntajes),
    };
  });
}
