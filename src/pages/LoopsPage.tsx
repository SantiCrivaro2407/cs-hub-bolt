import { Enlace } from '@/components/ui/Enlace';
import { EstadoLoopBadge } from '@/components/ui/Insignias';
import { useHub } from '@/context/HubContext';
import { rutaEscuela } from '@/lib/domain/cartera';
import { diasEntre, hacePlural } from '@/lib/domain/dates';
import { contarResueltas, loopVencido, ordenarLoops } from '@/lib/domain/loops';
import { navegar, urlConParams, useRuta } from '@/lib/router';
import type { EstadoLoop } from '@/lib/types';

const ESTADOS_LOOP: EstadoLoop[] = ['Open', 'Waiting', 'Ready to reply', 'Closed'];
const campo = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900';

export function LoopsPage() {
  const { datos, yo } = useHub();
  const { params } = useRuta();
  const estado = params.get('estado');
  const escuela = params.get('escuela');
  const owner = params.get('owner');
  const soloMios = params.get('mios') === '1';
  const soloVencidos = params.get('vencido') === '1';

  const cambiar = (cambios: Record<string, string | null>) => navegar(urlConParams('/loops', cambios, params));

  const todos = ordenarLoops(datos.loops);
  const visibles = todos
    .filter((l) => (estado ? l.estado === estado : true))
    .filter((l) => (escuela ? l.escuela_id === escuela : true))
    .filter((l) => (owner ? l.owner_id === owner : true))
    .filter((l) => (soloMios ? l.owner_id === yo.id : true))
    .filter((l) => (soloVencidos ? loopVencido(l) : true));

  const contadores = [
    { etiqueta: 'Ready to reply', valor: todos.filter((l) => l.estado === 'Ready to reply').length, tono: 'text-emerald-700', onClick: () => cambiar({ estado: 'Ready to reply', vencido: null }) },
    { etiqueta: 'Abiertos', valor: todos.filter((l) => l.estado !== 'Closed').length, tono: 'text-slate-900', onClick: () => cambiar({ estado: null, vencido: null }) },
    { etiqueta: 'Vencidos', valor: todos.filter((l) => loopVencido(l)).length, tono: 'text-rose-700', onClick: () => cambiar({ vencido: '1', estado: null }) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Loops</h1>
        <p className="mt-1 text-sm text-slate-600">Lo que las escuelas esperan de nosotros. Primero lo que está listo o vencido.</p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        {contadores.map((c) => (
          <button key={c.etiqueta} onClick={c.onClick} className="flex flex-col items-start rounded-xl border border-slate-200 bg-white px-5 py-4 text-left transition-colors hover:border-slate-400">
            <span className={`text-2xl font-semibold ${c.tono}`}>{c.valor}</span>
            <span className="text-sm text-slate-600">{c.etiqueta}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={estado ?? ''} onChange={(e) => cambiar({ estado: e.target.value || null })} className={campo} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {ESTADOS_LOOP.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <select value={escuela ?? ''} onChange={(e) => cambiar({ escuela: e.target.value || null })} className={campo} aria-label="Filtrar por escuela">
          <option value="">Todas las escuelas</option>
          {datos.escuelas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
        <select value={owner ?? ''} onChange={(e) => cambiar({ owner: e.target.value || null })} className={campo} aria-label="Filtrar por owner">
          <option value="">Todos los owners</option>
          {datos.equipo.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <input type="checkbox" checked={soloMios} onChange={(e) => cambiar({ mios: e.target.checked ? '1' : null })} className="accent-slate-900" />
          Solo míos
        </label>
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No hay loops con esos filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Loop</th>
                <th className="px-4 py-3 font-medium">Escuela</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Issues resueltas</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibles.map((loop) => {
                const esc = datos.escuelas.find((e) => e.id === loop.escuela_id);
                const ligadas = datos.issues.filter((i) => i.loop_id === loop.id);
                const vencido = loopVencido(loop);
                const owner = datos.equipo.find((m) => m.id === loop.owner_id);
                return (
                  <tr key={loop.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      {esc ? (
                        <Enlace href={rutaEscuela(esc, 'loops', { loop: loop.id })} className="font-medium text-slate-900 hover:underline">
                          {loop.titulo}
                        </Enlace>
                      ) : (
                        <span className="font-medium text-slate-900">{loop.titulo}</span>
                      )}
                      <p className="font-mono text-xs text-slate-500">{loop.id}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{esc?.nombre ?? '—'}</td>
                    <td className="px-4 py-3">
                      <EstadoLoopBadge estado={loop.estado} vencido={vencido} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {ligadas.length === 0 ? '—' : `${contarResueltas(ligadas)} de ${ligadas.length}`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{owner?.nombre ?? 'Sin owner'}</td>
                    <td className={`whitespace-nowrap px-4 py-3 ${vencido ? 'font-medium text-rose-700' : 'text-slate-600'}`}>
                      {hacePlural(diasEntre(loop.creado))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
