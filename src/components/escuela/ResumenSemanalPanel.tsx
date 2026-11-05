import { useHub } from '@/context/HubContext';
import { Enlace } from '@/components/ui/Enlace';
import { resumenSemanal } from '@/lib/domain/resumenSemanal';
import type { Escuela } from '@/lib/types';

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
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pendientes</h3>
        {resumen.pendientes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada pendiente con esta escuela.</p>
        ) : (
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm marker:text-muted-foreground">
            {resumen.pendientes.map((p) => (
              <li key={p.id}>
                <Enlace href={p.href} className="hover:underline">
                  {p.texto}
                </Enlace>
                {p.urgente && <span className="ml-2 text-xs font-medium text-triage-support-fg">Vencido</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
