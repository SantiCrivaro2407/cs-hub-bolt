import { useState } from 'react';
import { Info } from 'lucide-react';
import { BotonLinear, IssueDetalle } from '@/components/issues/IssueDetalle';
import { Enlace } from '@/components/ui/Enlace';
import { useHub } from '@/context/HubContext';
import { cambiarEstadoIssue } from '@/lib/actions/loops';
import { rutaEscuela } from '@/lib/domain/cartera';
import { hacePlural, diasEntre } from '@/lib/domain/dates';
import { ESTADOS_ISSUE, issueResuelta } from '@/lib/domain/loops';
import { navegar, urlConParams, useRuta } from '@/lib/router';
import type { Escuela, EquipoIssue, EstadoIssue } from '@/lib/types';

const campo = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900';

export function IssuesTab({ escuela }: { escuela: Escuela }) {
  const { datos, ctx, ejecutar } = useHub();
  const [equipo, setEquipo] = useState<EquipoIssue | ''>('');
  const [estado, setEstado] = useState<EstadoIssue | ''>('');
  const { params } = useRuta();
  const abrir = (id: string | null) => navegar(urlConParams(`/escuelas/${escuela.slug}`, { issue: id }, params));

  const todas = datos.issues.filter((i) => i.escuela_id === escuela.id);
  const visibles = todas
    .filter((i) => (equipo ? i.equipo === equipo : true))
    .filter((i) => (estado ? i.estado === estado : true))
    .sort((a, b) => b.actualizada.localeCompare(a.actualizada));

  const abiertasCs = todas.filter((i) => i.equipo === 'CS' && !issueResuelta(i)).length;
  const abiertasTech = todas.filter((i) => i.equipo === 'Tech' && !issueResuelta(i)).length;
  const resueltas = todas.filter(issueResuelta).length;
  const abierta = todas.find((i) => i.id === params.get('issue'));

  const contadores = [
    { etiqueta: 'Abiertas CS', valor: abiertasCs },
    { etiqueta: 'Abiertas Tech', valor: abiertasTech },
    { etiqueta: 'Resueltas', valor: resueltas },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        {contadores.map((c) => (
          <div key={c.etiqueta} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-2xl font-semibold text-slate-900">{c.valor}</p>
            <p className="text-xs text-slate-600 sm:text-sm">{c.etiqueta}</p>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        <p className="text-sm text-slate-700">Sincronizado desde Linear (simulado) · tocá una issue para ver el detalle</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={equipo} onChange={(e) => setEquipo(e.target.value as EquipoIssue | '')} className={campo} aria-label="Filtrar por equipo">
          <option value="">Todos los equipos</option>
          <option value="CS">CS</option>
          <option value="Tech">Tech</option>
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoIssue | '')} className={campo} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {ESTADOS_ISSUE.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No hay issues con esos filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Equipo</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Asignado</th>
                <th className="px-4 py-3 font-medium">Actualizada</th>
                <th className="px-4 py-3 font-medium">Loop</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Linear</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibles.map((issue) => (
                <tr key={issue.id} className="transition-colors hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">{issue.id}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => abrir(issue.id)} className="text-left font-medium text-slate-900 hover:underline">
                      {issue.titulo}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{issue.equipo}</td>
                  <td className="px-4 py-3">
                    <select
                        value={issue.estado}
                        aria-label={`Cambiar estado de ${issue.id}`}
                        onChange={(e) => ejecutar(() => cambiarEstadoIssue(ctx, issue, e.target.value as EstadoIssue), 'Estado actualizado')}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-slate-900"
                      >
                        {ESTADOS_ISSUE.map((e) => (
                          <option key={e} value={e}>
                            {e}
                          </option>
                        ))}
                      </select>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{issue.asignado}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{hacePlural(diasEntre(issue.actualizada))}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {issue.loop_id ? (
                      <Enlace href={rutaEscuela(escuela, 'loops', { loop: issue.loop_id })} className="font-mono text-xs text-slate-700 underline">
                        {issue.loop_id}
                      </Enlace>
                    ) : (
                      <span className="text-xs text-slate-400">Sin loop</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <BotonLinear item={issue} compacto />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {abierta && <IssueDetalle issue={abierta} escuela={escuela} onCerrar={() => abrir(null)} />}
    </div>
  );
}
