import { ChevronRight, ListTodo, Mail, MessageSquare, Repeat } from 'lucide-react';
import { Enlace } from '@/components/ui/Enlace';
import { EstadoIssueBadge, Pill } from '@/components/ui/Insignias';
import { useHub } from '@/context/HubContext';
import { rutaEscuela } from '@/lib/domain/cartera';
import type { Pendiente, TipoPendiente } from '@/lib/domain/pendientes';
import { resumenSemanal } from '@/lib/domain/resumenSemanal';
import type { Escuela } from '@/lib/types';

// Primero lo que la escuela está esperando que le respondamos; después el trabajo de CS.
const SECCIONES: { tipo: TipoPendiente; titulo: string; icono: typeof Mail; vencido: string; pestana: string }[] = [
  { tipo: 'ticket', titulo: 'Tickets sin responder', icono: MessageSquare, vencido: 'Vencido', pestana: 'tickets' },
  { tipo: 'mail', titulo: 'Mails sin responder', icono: Mail, vencido: 'Vencido', pestana: 'interacciones' },
  { tipo: 'loop', titulo: 'Loops abiertos', icono: Repeat, vencido: 'Vencido', pestana: 'loops' },
  { tipo: 'issue', titulo: 'Issues de CS sueltas', icono: ListTodo, vencido: 'Quieta', pestana: 'issues' },
];
const MAX_POR_SECCION = 6;

function FilaPendiente({ p, vencido }: { p: Pendiente; vencido: string }) {
  return (
    <li className="overflow-hidden rounded-lg border border-border bg-card">
      <Enlace href={p.href} className="group flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-accent/40">
        {p.issue && <span className="mt-0.5 shrink-0 font-mono text-xs text-muted-foreground">{p.issue.id}</span>}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium group-hover:underline">{p.titulo}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{p.detalle}</p>
        </div>
        {p.issue && <EstadoIssueBadge estado={p.issue.estado} />}
        {p.listo && <Pill tono="verde">Listo para responder</Pill>}
        {p.urgente && <Pill tono="rojo">{vencido}</Pill>}
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />
      </Enlace>
      {p.subIssues && p.subIssues.length > 0 && (
        <ul className="flex flex-col border-t border-border bg-muted/20">
          {p.subIssues.map((i) => (
            <li key={i.id}>
              <Enlace href={i.href} className="group flex items-center gap-2 py-1.5 pl-6 pr-3 text-xs transition-colors hover:bg-accent/40" title={i.titulo}>
                <span className="shrink-0 font-mono text-muted-foreground">{i.id}</span>
                <span className="min-w-0 flex-1 truncate group-hover:underline">{i.titulo}</span>
                <EstadoIssueBadge estado={i.estado} />
              </Enlace>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** Lo primero que se ve al entrar a una escuela: qué pasó en la semana y qué queda por hacer. */
export function ResumenSemanalPanel({ escuela }: { escuela: Escuela }) {
  const { datos } = useHub();
  const resumen = resumenSemanal(datos, escuela);

  return (
    <section aria-labelledby="resumen-semanal" className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs">
      <h2 id="resumen-semanal" className="text-base font-semibold">
        Última semana
      </h2>
      <div className="flex max-w-3xl flex-col gap-3 text-sm leading-relaxed text-foreground/90">
        <p>{resumen.health}</p>
        <p>{resumen.actividad}</p>
      </div>
      <div className="flex flex-col gap-4 border-t border-border pt-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Pendientes{resumen.pendientes.length > 0 && <span className="normal-case tracking-normal"> · {resumen.pendientes.length}</span>}
        </h3>
        {resumen.pendientes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada sin responder ni issues de CS abiertas con esta escuela.</p>
        ) : (
          SECCIONES.map(({ tipo, titulo, icono: Icono, vencido, pestana }) => {
            const items = resumen.pendientes.filter((p) => p.tipo === tipo);
            if (items.length === 0) return null;
            return (
              <section key={tipo} className="flex flex-col gap-2">
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <Icono className="h-4 w-4 text-muted-foreground" aria-hidden />
                  {titulo}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">{items.length}</span>
                </h4>
                <ul className="flex flex-col gap-1.5">
                  {items.slice(0, MAX_POR_SECCION).map((p) => (
                    <FilaPendiente key={p.id} p={p} vencido={vencido} />
                  ))}
                </ul>
                {items.length > MAX_POR_SECCION && (
                  <Enlace href={rutaEscuela(escuela, pestana)} className="w-fit text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
                    Ver los {items.length}
                  </Enlace>
                )}
              </section>
            );
          })
        )}
      </div>
    </section>
  );
}
