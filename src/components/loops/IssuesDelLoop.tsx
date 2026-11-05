import { useState, type FormEvent } from 'react';
import { BotonLinear } from '@/components/issues/IssueDetalle';
import { Boton } from '@/components/ui/Boton';
import { Enlace } from '@/components/ui/Enlace';
import { EstadoIssueBadge, Pill } from '@/components/ui/Insignias';
import { useHub } from '@/context/HubContext';
import { crearIssueTech, ligarIssue } from '@/lib/actions/loops';
import type { Escuela, Issue, Loop } from '@/lib/types';
import { issueResuelta } from '@/lib/domain/loops';
import { rutaEscuela } from '@/lib/domain/cartera';

const campo = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900';

export function IssuesDelLoop({ loop, escuela }: { loop: Loop; escuela: Escuela }) {
  const { datos, ctx, ejecutar } = useHub();
  const [issueId, setIssueId] = useState('');
  const [tituloTech, setTituloTech] = useState('');
  const ligadas = datos.issues.filter((i) => i.loop_id === loop.id);
  const libres = datos.issues.filter((i) => i.escuela_id === escuela.id && !i.loop_id);
  const issueElegida: Issue | undefined = libres.find((i) => i.id === issueId);

  const ligar = async () => {
    if (!issueElegida) return;
    const ok = await ejecutar(() => ligarIssue(ctx, loop, issueElegida), `Issue ${issueElegida.id} ligada al loop`);
    if (ok) setIssueId('');
  };

  const crearTech = async (e: FormEvent) => {
    e.preventDefault();
    if (tituloTech.trim() === '') return;
    const ok = await ejecutar(() => crearIssueTech(ctx, loop, tituloTech.trim()), 'Issue creada en Tech');
    if (ok) setTituloTech('');
  };

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Issues ligadas</h3>
      {ligadas.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no hay issues ligadas a este loop.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {ligadas.map((issue) => (
            <li key={issue.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <div className="min-w-0">
                <Enlace href={rutaEscuela(escuela, 'issues', { issue: issue.id })} className="text-sm text-slate-900 hover:underline">
                  {issue.titulo}
                </Enlace>
                <p className="font-mono text-xs text-slate-500">
                  {issue.id} · {issue.equipo}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {issueResuelta(issue) && <Pill tono="verde">Resuelta</Pill>}
                <EstadoIssueBadge estado={issue.estado} />
                <BotonLinear item={issue} compacto />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <label className="text-xs font-medium text-slate-700" htmlFor={`ligar-${loop.id}`}>
            Ligar issue existente
          </label>
          <div className="flex gap-2">
            <select id={`ligar-${loop.id}`} value={issueId} onChange={(e) => setIssueId(e.target.value)} className={`${campo} min-w-0 flex-1`}>
              <option value="">Elegir issue sin loop</option>
              {libres.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.id} · {i.titulo}
                </option>
              ))}
            </select>
            <Boton variante="secundario" onClick={ligar} disabled={!issueElegida}>
              Ligar
            </Boton>
          </div>
        </div>
        <form onSubmit={crearTech} className="flex min-w-0 flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <label className="text-xs font-medium text-slate-700" htmlFor={`tech-${loop.id}`}>
            Crear issue en Tech
          </label>
          <div className="flex gap-2">
            <input id={`tech-${loop.id}`} value={tituloTech} onChange={(e) => setTituloTech(e.target.value)} placeholder="Título de la issue" className={`${campo} min-w-0 flex-1`} />
            <Boton type="submit" variante="secundario" disabled={tituloTech.trim() === ''}>
              Crear
            </Boton>
          </div>
        </form>
      </div>
    </section>
  );
}
