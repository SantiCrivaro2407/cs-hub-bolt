import { TicketsPanel } from '@/components/tickets/TicketsPanel';
import { Boton } from '@/components/ui/Boton';
import { useHub } from '@/context/HubContext';
import { crearTicketSimulado } from '@/lib/actions/tickets';
import { ticketVencido } from '@/lib/domain/loops';

export function TicketsPage() {
  const { datos, ctx, ejecutar } = useHub();
  const contadores = [
    { etiqueta: 'Nuevos', valor: datos.tickets.filter((t) => t.estado === 'Nuevo').length },
    { etiqueta: 'En curso', valor: datos.tickets.filter((t) => t.estado === 'En curso').length },
    { etiqueta: 'Resueltos', valor: datos.tickets.filter((t) => t.estado === 'Resuelto').length },
    { etiqueta: 'Vencidos', valor: datos.tickets.filter((t) => ticketVencido(t)).length },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Tickets</h1>
          <p className="mt-1 text-sm text-slate-600">Consultas de Talk with us de todas las escuelas, ordenadas por lo que más espera.</p>
        </div>
        <Boton variante="secundario" onClick={() => ejecutar(() => crearTicketSimulado(ctx), 'Ticket simulado creado')}>
          Simular ticket nuevo
        </Boton>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {contadores.map((c) => (
          <div key={c.etiqueta} className="rounded-xl border border-slate-200 bg-white px-5 py-4">
            <p className="text-2xl font-semibold text-slate-900">{c.valor}</p>
            <p className="text-sm text-slate-600">{c.etiqueta}</p>
          </div>
        ))}
      </div>

      <TicketsPanel />
    </div>
  );
}
