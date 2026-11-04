import { fechaCorta } from '@/lib/domain/dates';
import { nivelHealth, totalSnapshot } from '@/lib/domain/health';
import type { HealthSnapshot } from '@/lib/types';

const ANCHO = 640;
const ALTO = 220;
const MARGEN = { arriba: 16, derecha: 24, abajo: 32, izquierda: 36 };
const COLOR_NIVEL = { ok: '#059669', warn: '#d97706', risk: '#e11d48' };

export function HealthGrafico({ historia }: { historia: HealthSnapshot[] }) {
  const puntos = historia.slice(-8).map((s) => ({ fecha: s.fecha, total: totalSnapshot(s) }));
  if (puntos.length === 0) return null;

  const area = { ancho: ANCHO - MARGEN.izquierda - MARGEN.derecha, alto: ALTO - MARGEN.arriba - MARGEN.abajo };
  const x = (i: number) => MARGEN.izquierda + (puntos.length === 1 ? area.ancho / 2 : (i / (puntos.length - 1)) * area.ancho);
  const y = (valor: number) => MARGEN.arriba + area.alto - (valor / 100) * area.alto;
  const trazo = puntos.map((p, i) => `${x(i)},${y(p.total)}`).join(' ');
  const ultimo = puntos.length - 1;

  return (
    <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img" aria-label="Evolución del health en las últimas 8 semanas">
      {[0, 50, 70, 100].map((valor) => (
        <g key={valor}>
          <line
            x1={MARGEN.izquierda}
            x2={ANCHO - MARGEN.derecha}
            y1={y(valor)}
            y2={y(valor)}
            stroke={valor === 50 || valor === 70 ? (valor === 70 ? '#10b981' : '#f59e0b') : '#e2e8f0'}
            strokeDasharray={valor === 50 || valor === 70 ? '4 4' : undefined}
          />
          <text x={MARGEN.izquierda - 8} y={y(valor) + 4} textAnchor="end" className="fill-slate-500 text-[11px]">
            {valor}
          </text>
        </g>
      ))}
      <polyline points={trazo} fill="none" stroke="#475569" strokeWidth={2} strokeLinejoin="round" />
      {puntos.map((p, i) => (
        <g key={p.fecha}>
          <circle cx={x(i)} cy={y(p.total)} r={i === ultimo ? 6 : 4} fill={COLOR_NIVEL[nivelHealth(p.total)]} stroke="white" strokeWidth={2} />
          <text x={x(i)} y={ALTO - 8} textAnchor="middle" className="fill-slate-500 text-[11px]">
            {i === ultimo ? 'Hoy' : fechaCorta(p.fecha)}
          </text>
        </g>
      ))}
    </svg>
  );
}
