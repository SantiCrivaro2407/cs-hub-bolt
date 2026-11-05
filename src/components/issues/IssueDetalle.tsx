import { ExternalLink } from 'lucide-react';
import { Enlace } from '@/components/ui/Enlace';
import { EstadoIssueBadge, Pill } from '@/components/ui/Insignias';
import { Modal } from '@/components/ui/Modal';
import { useHub } from '@/context/HubContext';
import { cambiarEstadoIssue } from '@/lib/actions/loops';
import { rutaEscuela } from '@/lib/domain/cartera';
import { diasEntre, fechaHora, hacePlural } from '@/lib/domain/dates';
import { ESTADOS_ISSUE, urlLinear } from '@/lib/domain/loops';
import type { Escuela, EstadoIssue, Issue, Loop } from '@/lib/types';

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{etiqueta}</dt>
      <dd className="text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export function BotonLinear({ item, compacto = false }: { item: Pick<Issue | Loop, 'id' | 'url'>; compacto?: boolean }) {
  return (
    <a
      href={urlLinear(item)}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={
        compacto
          ? 'inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 hover:underline'
          : 'inline-flex w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50'
      }
    >
      {compacto ? 'Linear' : 'Abrir en Linear'}
      <ExternalLink className={compacto ? 'h-3 w-3' : 'h-3.5 w-3.5 text-slate-500'} aria-hidden />
    </a>
  );
}

export function IssueDetalle({ issue, escuela, onCerrar }: { issue: Issue; escuela: Escuela; onCerrar: () => void }) {
  const { datos, ctx, ejecutar } = useHub();
  const loop = datos.loops.find((l) => l.id === issue.loop_id);

  return (
    <Modal titulo={`${issue.id} · ${issue.titulo}`} onCerrar={onCerrar} ancho="max-w-2xl">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <EstadoIssueBadge estado={issue.estado} />
          <Pill>{issue.equipo}</Pill>
          <span className="text-sm text-slate-600">{escuela.nombre}</span>
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descripción</h3>
          {issue.descripcion ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-800">{issue.descripcion}</p>
          ) : (
            <p className="text-sm text-slate-500">Sin descripción. El detalle completo está en Linear.</p>
          )}
        </section>

        <dl className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Estado</span>
            <select
              value={issue.estado}
              onChange={(e) => ejecutar(() => cambiarEstadoIssue(ctx, issue, e.target.value as EstadoIssue), 'Estado actualizado')}
              className="w-fit rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-900"
            >
              {ESTADOS_ISSUE.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
          <Dato etiqueta="Asignado">{issue.asignado}</Dato>
          <Dato etiqueta="Actualizada">
            {hacePlural(diasEntre(issue.actualizada))} · {fechaHora(issue.actualizada)}
          </Dato>
          <Dato etiqueta="Loop">
            {loop ? (
              <Enlace href={rutaEscuela(escuela, 'loops', { loop: loop.id })} className="underline">
                {loop.id} · {loop.titulo}
              </Enlace>
            ) : (
              <span className="text-slate-500">Sin loop</span>
            )}
          </Dato>
        </dl>

        <div className="border-t border-slate-200 pt-4">
          <BotonLinear item={issue} />
        </div>
      </div>
    </Modal>
  );
}
