import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CrearLoopPanel } from '@/components/loops/CrearLoopPanel';
import { LoopDetalle } from '@/components/loops/LoopDetalle';
import { Boton } from '@/components/ui/Boton';
import { EstadoLoopBadge, Pill } from '@/components/ui/Insignias';
import { useHub } from '@/context/HubContext';
import { nombreEquipo } from '@/lib/domain/cartera';
import { diasEntre, hacePlural } from '@/lib/domain/dates';
import { loopVencido, ordenarLoops } from '@/lib/domain/loops';
import { navegar, urlConParams, useRuta } from '@/lib/router';
import type { Escuela } from '@/lib/types';

export function LoopsTab({ escuela }: { escuela: Escuela }) {
  const { datos } = useHub();
  const { params } = useRuta();
  const [creando, setCreando] = useState(false);
  const loops = ordenarLoops(datos.loops.filter((l) => l.escuela_id === escuela.id));
  const abiertos = loops.filter((l) => l.estado !== 'Closed').length;
  const cerrados = loops.length - abiertos;
  const expandido = params.get('loop');
  const base = `/escuelas/${escuela.slug}`;

  const alternar = (id: string) => {
    navegar(urlConParams(base, { loop: expandido === id ? null : id }, params));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">Abiertos {abiertos}</span> · Cerrados {cerrados}
        </p>
        <Boton variante="primario" onClick={() => setCreando(true)}>
          Nuevo loop
        </Boton>
      </div>

      {loops.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Esta escuela todavía no tiene loops.
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {loops.map((loop) => {
          const abierto = expandido === loop.id;
          const vencido = loopVencido(loop);
          return (
            <li
              key={loop.id}
              id={`loop-${loop.id}`}
              className={`overflow-hidden rounded-xl border bg-white transition-shadow ${abierto ? 'border-slate-400 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <button
                onClick={() => alternar(loop.id)}
                aria-expanded={abierto}
                className="flex w-full items-start gap-4 p-5 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-slate-500">{loop.id}</span>
                    <EstadoLoopBadge estado={loop.estado} vencido={vencido} />
                    {loop.origen === 'manual' && <Pill>Manual</Pill>}
                  </div>
                  <p className="mt-2 text-base font-medium text-slate-900">{loop.titulo}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{loop.que_pidio}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Owner {nombreEquipo(datos, loop.owner_id)} · {hacePlural(diasEntre(loop.creado))}
                  </p>
                </div>
                <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-slate-500 transition-transform ${abierto ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              {abierto && <LoopDetalle loop={loop} escuela={escuela} />}
            </li>
          );
        })}
      </ul>

      {creando && <CrearLoopPanel escuela={escuela} origen="manual" onCerrar={() => setCreando(false)} />}
    </div>
  );
}
