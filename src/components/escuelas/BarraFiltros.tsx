import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Search, SlidersHorizontal, X } from 'lucide-react';
import type { Equipo, Etapa } from '@/lib/types';

export type FiltroColor = 'todos' | 'ok' | 'warn' | 'risk';

export interface Filtros {
  busqueda: string;
  etapa: Etapa | '';
  owner: string;
  color: FiltroColor;
  soloMias: boolean;
}

export const FILTROS_VACIOS: Filtros = { busqueda: '', etapa: '', owner: '', color: 'todos', soloMias: false };

const ETAPAS: Etapa[] = ['Piloto', 'Onboarding', 'Live', 'Renovación'];
const CAMPO =
  'h-8 w-full cursor-pointer rounded-md border border-input bg-background px-2.5 text-sm shadow-xs outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50';
const BOTON_REDONDO =
  'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

/** Barra flotante al pie de Escuelas: búsqueda, filtros y escuelas ocultas por los filtros. */
export function BarraFiltros({
  filtros,
  onCambiar,
  equipo,
  ocultas,
}: {
  filtros: Filtros;
  onCambiar: (filtros: Filtros) => void;
  equipo: Equipo[];
  ocultas: number;
}) {
  const [buscando, setBuscando] = useState(filtros.busqueda !== '');
  const [panelAbierto, setPanelAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const activos = [filtros.etapa !== '', filtros.owner !== '', filtros.color !== 'todos', filtros.soloMias].filter(Boolean).length;
  const set = <K extends keyof Filtros>(clave: K, valor: Filtros[K]) => onCambiar({ ...filtros, [clave]: valor });

  useEffect(() => {
    if (!panelAbierto) return;
    const cerrarAfuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setPanelAbierto(false);
    };
    const cerrarConEsc = (e: KeyboardEvent) => e.key === 'Escape' && setPanelAbierto(false);
    document.addEventListener('mousedown', cerrarAfuera);
    window.addEventListener('keydown', cerrarConEsc);
    return () => {
      document.removeEventListener('mousedown', cerrarAfuera);
      window.removeEventListener('keydown', cerrarConEsc);
    };
  }, [panelAbierto]);

  return (
    <div ref={caja} className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 lg:left-[calc(50%+8rem)]">
      {panelAbierto && (
        <div className="absolute bottom-full left-1/2 mb-3 flex w-72 -translate-x-1/2 flex-col gap-3 rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-caps text-muted-foreground">Filtros</span>
            {activos > 0 && (
              <button onClick={() => onCambiar({ ...FILTROS_VACIOS, busqueda: filtros.busqueda })} className="text-xs text-muted-foreground hover:text-foreground">
                Limpiar
              </button>
            )}
          </div>
          <select value={filtros.etapa} onChange={(e) => set('etapa', e.target.value as Etapa | '')} className={CAMPO} aria-label="Etapa">
            <option value="">Todas las etapas</option>
            {ETAPAS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <select value={filtros.owner} onChange={(e) => set('owner', e.target.value)} className={CAMPO} aria-label="Owner">
            <option value="">Todos los owners</option>
            {equipo.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
          <select value={filtros.color} onChange={(e) => set('color', e.target.value as FiltroColor)} className={CAMPO} aria-label="Health">
            <option value="todos">Todo el health</option>
            <option value="ok">Verde (≥ 70)</option>
            <option value="warn">Amarillo (50–69)</option>
            <option value="risk">Rojo (&lt; 50)</option>
          </select>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={filtros.soloMias} onChange={(e) => set('soloMias', e.target.checked)} className="accent-primary" />
            Solo mis escuelas
          </label>
        </div>
      )}

      <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1.5 shadow-lg">
        {buscando ? (
          <div className="flex h-10 items-center gap-2 rounded-full bg-muted px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={filtros.busqueda}
              onChange={(e) => set('busqueda', e.target.value)}
              placeholder="Buscar escuela"
              className="w-32 bg-transparent text-sm outline-none placeholder:text-muted-foreground sm:w-44"
            />
            <button
              onClick={() => {
                set('busqueda', '');
                setBuscando(false);
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Cerrar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button onClick={() => setBuscando(true)} className={`${BOTON_REDONDO} text-foreground hover:bg-accent`} aria-label="Buscar escuela">
            <Search className="h-5 w-5" />
          </button>
        )}

        <button
          onClick={() => setPanelAbierto(!panelAbierto)}
          className={`${BOTON_REDONDO} bg-primary text-primary-foreground shadow-tactile hover:bg-primary/90`}
          aria-label="Filtros"
          aria-expanded={panelAbierto}
        >
          <SlidersHorizontal className="h-5 w-5" />
          {activos > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-card bg-foreground px-0.5 text-[10px] font-semibold text-background">
              {activos}
            </span>
          )}
        </button>

        <button
          onClick={() => onCambiar(FILTROS_VACIOS)}
          disabled={ocultas === 0}
          title={ocultas === 0 ? 'Se ven todas las escuelas' : `${ocultas} escuelas ocultas por los filtros · mostrar todas`}
          className={`${BOTON_REDONDO} text-foreground hover:bg-accent disabled:text-muted-foreground disabled:hover:bg-transparent`}
          aria-label={ocultas === 0 ? 'Se ven todas las escuelas' : `Mostrar ${ocultas} escuelas ocultas`}
        >
          {ocultas === 0 ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          {ocultas > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-triage-watch-strong px-1 text-[10px] font-semibold text-white">
              {ocultas}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
