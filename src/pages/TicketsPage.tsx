import { TicketsPanel } from '@/components/tickets/TicketsPanel';
import { Boton } from '@/components/ui/Boton';
import { useHub } from '@/context/HubContext';
import { crearTicketSimulado } from '@/lib/actions/tickets';

export function TicketsPage() {
  const { ctx, ejecutar } = useHub();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl">Tickets</h1>
          <p className="mt-1 text-sm text-muted-foreground">Las consultas de Talk with us de todas las escuelas. Se leen y se responden acá, sin entrar a HubSpot.</p>
        </div>
        <Boton variante="secundario" onClick={() => ejecutar(() => crearTicketSimulado(ctx), 'Ticket simulado creado')}>
          Simular ticket nuevo
        </Boton>
      </header>

      <TicketsPanel />
    </div>
  );
}
