import type { HealthSnapshot } from '@/lib/types';
import { diasEntre } from '@/lib/domain/dates';

export const CATEGORIAS_HEALTH = [
  { key: 'activacion', label: 'Activación' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'calidad', label: 'Calidad' },
  { key: 'cobertura', label: 'Cobertura' },
  { key: 'resultados', label: 'Resultados' },
] as const;

export type CategoriaKey = (typeof CATEGORIAS_HEALTH)[number]['key'];

export type NivelHealth = 'ok' | 'warn' | 'risk';

export function totalSnapshot(snapshot: HealthSnapshot): number {
  const suma = CATEGORIAS_HEALTH.reduce((acc, categoria) => acc + snapshot[categoria.key], 0);
  return Math.round(suma / CATEGORIAS_HEALTH.length);
}

export function nivelHealth(total: number): NivelHealth {
  if (total >= 70) return 'ok';
  if (total >= 50) return 'warn';
  return 'risk';
}

export const ETIQUETA_NIVEL: Record<NivelHealth, string> = {
  ok: 'Bien',
  warn: 'Atención',
  risk: 'En riesgo',
};

export interface ResumenHealth {
  actual: HealthSnapshot | null;
  total: number | null;
  referencia: HealthSnapshot | null;
  totalReferencia: number | null;
  delta: number | null;
  caida: boolean;
  historia: HealthSnapshot[];
}

export function resumenHealth(snapshots: HealthSnapshot[]): ResumenHealth {
  const historia = [...snapshots].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const actual = historia.at(-1) ?? null;
  if (!actual) {
    return { actual: null, total: null, referencia: null, totalReferencia: null, delta: null, caida: false, historia };
  }

  const hace15 = new Date();
  hace15.setDate(hace15.getDate() - 15);
  const referencia = historia
    .filter((snapshot) => snapshot !== actual)
    .reduce<HealthSnapshot | null>((mejor, candidato) => {
      if (!mejor) return candidato;
      const distanciaMejor = Math.abs(diasEntre(mejor.fecha, hace15));
      const distanciaCandidato = Math.abs(diasEntre(candidato.fecha, hace15));
      return distanciaCandidato < distanciaMejor ? candidato : mejor;
    }, null);

  const total = totalSnapshot(actual);
  const totalReferencia = referencia ? totalSnapshot(referencia) : null;
  const delta = totalReferencia === null ? null : total - totalReferencia;
  return {
    actual,
    total,
    referencia,
    totalReferencia,
    delta,
    caida: delta !== null && delta <= -15,
    historia,
  };
}

export function formatoDelta(delta: number | null): string {
  if (delta === null) return 'sin referencia';
  if (delta > 0) return `+${delta} vs hace 15 días`;
  if (delta < 0) return `−${Math.abs(delta)} vs hace 15 días`;
  return 'Sin cambios vs hace 15 días';
}
