import { LoopsAgrupados, grupoDeLoop } from '@/components/loops/LoopsAgrupados';
import { Enlace } from '@/components/ui/Enlace';
import { useHub } from '@/context/HubContext';
import { diasEntre, hacePlural } from '@/lib/domain/dates';
import { ticketVencido } from '@/lib/domain/loops';
import type { Equipo, HubData } from '@/lib/types';

/** Lo que la persona tiene que hacer: sus tickets sin resolver y sus loops abiertos. */
export function pendientesDe(datos: HubData, yo: Equipo) {
  const tickets = datos.tickets
    .filter((t) => t.owner_id === yo.id && t.estado !== 'Resuelto')
    .sort((a, b) => Number(b.estado === 'Nuevo') - Number(a.estado === 'Nuevo') || a.creado.localeCompare(b.creado));
  const loops = datos.loops.filter((l) => l.owner_id === yo.id && l.estado !== 'Closed');
  return { tickets, loops };
}

/** Cuántas cosas de la persona piden acción ya: tickets nuevos, loops para responder y loops vencidos. */
export function urgentesDe(datos: HubData, yo: Equipo): number {
  const { tickets, loops } = pendientesDe(datos, yo);
  return tickets.filter((t) => t.estado === 'Nuevo').length + loops.filter((l) => grupoDeLoop(l) !== 'curso').length;
}

export function MisPendientesPage() {
  const { datos, yo } = useHub();
  const { tickets, loops } = pendientesDe(datos, yo);
  const nada = tickets.length === 0 && loops.length === 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <h1 className="text-2xl">Mis pendientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Los tickets y loops de los que sos owner, {yo.nombre}. Lo más urgente primero.</p>
      </header>

      {nada && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No tenés nada pendiente. Podés revisar la cartera en{' '}
          <Enlace href="/" className="font-medium text-foreground underline underline-offset-4">
            Escuelas
          </Enlace>
          .
        </div>
      )}

      {tickets.length > 0 && (
        <section aria-labelledby="mis-tickets">
          <div className="mb-3">
            <h2 id="mis-tickets" className="text-base">
              Tickets <span className="font-normal tabular-nums text-muted-foreground">{tickets.length}</span>
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Los nuevos tienen 1 día hábil para tener respuesta.</p>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {tickets.map((t) => {
              const escuela = datos.escuelas.find((e) => e.id === t.escuela_id);
              const contacto = datos.contactos.find((c) => c.id === t.contacto_id);
              const vencido = ticketVencido(t);
              return (
                <li key={t.id}>
                  <Enlace href={`/tickets?ticket=${t.id}`} className="group flex items-center gap-4 px-4 py-3 hover:bg-accent/50">
                    <div className="min-w-0 flex-1">
                      <div className={`truncate group-hover:underline ${t.estado === 'Nuevo' ? 'font-semibold' : 'font-medium'}`}>{t.asunto}</div>
                      <div className="mt-0.5 truncate text-sm text-muted-foreground">
                        {[escuela?.nombre, contacto ? `de ${contacto.nombre}` : null, t.estado === 'Nuevo' ? null : t.estado.toLowerCase()].filter(Boolean).join(', ')}
                      </div>
                    </div>
                    <span className={`shrink-0 text-sm tabular-nums ${vencido ? 'font-medium text-triage-support-fg' : 'text-muted-foreground'}`}>
                      {vencido ? 'Sin respuesta, ' : ''}
                      {hacePlural(diasEntre(t.creado))}
                    </span>
                  </Enlace>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {loops.length > 0 && <LoopsAgrupados loops={loops} mostrarOwner={false} />}
    </div>
  );
}
