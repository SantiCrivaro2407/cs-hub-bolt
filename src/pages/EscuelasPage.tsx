import { useMemo, useState } from 'react';
import { TarjetaEscuela } from '@/components/escuelas/TarjetaEscuela';
import { useHub } from '@/context/HubContext';
import { ordenarCartera, resumenEscuela } from '@/lib/domain/cartera';
import { navegar } from '@/lib/router';
import type { Etapa } from '@/lib/types';
import { nivelHealth } from '@/lib/domain/health';

const ETAPAS: Etapa[] = ['Piloto', 'Onboarding', 'Live', 'Renovación'];
type FiltroColor = 'todos' | 'ok' | 'warn' | 'risk';

function Contador({ valor, etiqueta, onClick, tono }: { valor: number; etiqueta: string; onClick: () => void; tono: 'rojo' | 'verde' | 'ambar' | 'neutro' }) {
  const color = { rojo: 'text-rose-700', verde: 'text-emerald-700', ambar: 'text-amber-700', neutro: 'text-slate-900' }[tono];
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start rounded-xl border border-slate-200 bg-white px-5 py-4 text-left transition-colors hover:border-slate-400"
    >
      <span className={`text-2xl font-semibold ${color}`}>{valor}</span>
      <span className="text-sm text-slate-600">{etiqueta}</span>
    </button>
  );
}

export function EscuelasPage() {
  const { datos, yo } = useHub();
  const [etapa, setEtapa] = useState<Etapa | ''>('');
  const [owner, setOwner] = useState('');
  const [color, setColor] = useState<FiltroColor>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [soloMias, setSoloMias] = useState(false);

  const resumenes = useMemo(() => ordenarCartera(datos.escuelas.map((e) => resumenEscuela(datos, e))), [datos]);

  const visibles = resumenes.filter(({ escuela, health }) => {
    if (etapa && escuela.etapa !== etapa) return false;
    if (owner && escuela.owner_id !== owner) return false;
    if (soloMias && escuela.owner_id !== yo.id) return false;
    if (color !== 'todos') {
      if (health.total === null || nivelHealth(health.total) !== color) return false;
    }
    if (busqueda && !escuela.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())) return false;
    return true;
  });

  const enRojo = resumenes.filter((r) => r.health.total !== null && nivelHealth(r.health.total) === 'risk').length;
  const listos = resumenes.reduce((acc, r) => acc + r.loopsListos, 0);
  const nuevos = resumenes.reduce((acc, r) => acc + r.ticketsNuevos, 0);
  const vencidos = resumenes.reduce((acc, r) => acc + r.loopsVencidos, 0);

  const campo = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900';

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Escuelas</h1>
        <p className="mt-1 text-sm text-slate-600">Clientes actuales. Primero las que necesitan atención.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Contador valor={enRojo} etiqueta="Escuelas en rojo" tono="rojo" onClick={() => setColor('risk')} />
        <Contador valor={listos} etiqueta="Loops Ready to reply" tono="verde" onClick={() => navegar('/loops?estado=Ready+to+reply')} />
        <Contador valor={nuevos} etiqueta="Tickets nuevos" tono="ambar" onClick={() => navegar('/tickets?estado=Nuevo')} />
        <Contador valor={vencidos} etiqueta="Loops vencidos" tono="rojo" onClick={() => navegar('/loops?vencido=1')} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre"
          className={`${campo} w-full sm:w-56`}
        />
        <select value={etapa} onChange={(e) => setEtapa(e.target.value as Etapa | '')} className={campo}>
          <option value="">Todas las etapas</option>
          {ETAPAS.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <select value={owner} onChange={(e) => setOwner(e.target.value)} className={campo}>
          <option value="">Todos los owners</option>
          {datos.equipo.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
        <select value={color} onChange={(e) => setColor(e.target.value as FiltroColor)} className={campo}>
          <option value="todos">Todo el health</option>
          <option value="ok">Verde (≥ 70)</option>
          <option value="warn">Amarillo (50–69)</option>
          <option value="risk">Rojo (&lt; 50)</option>
        </select>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <input type="checkbox" checked={soloMias} onChange={(e) => setSoloMias(e.target.checked)} className="accent-slate-900" />
          Solo mis escuelas
        </label>
      </div>

      <p className="text-sm text-slate-500">
        {visibles.length} de {resumenes.length} escuelas
      </p>

      <div className="flex flex-col gap-3">
        {visibles.map((r) => (
          <TarjetaEscuela key={r.escuela.id} resumen={r} />
        ))}
        {visibles.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            No hay escuelas con esos filtros.
          </div>
        )}
      </div>
    </div>
  );
}
