import { Boton } from '@/components/ui/Boton';
import { Enlace } from '@/components/ui/Enlace';
import { EstadoTicketBadge } from '@/components/ui/Insignias';
import { Modal } from '@/components/ui/Modal';
import { useHub } from '@/context/HubContext';
import { cambiarEstadoTicket, cambiarOwnerTicket } from '@/lib/actions/tickets';
import { rutaEscuela } from '@/lib/domain/cartera';
import { fechaHora } from '@/lib/domain/dates';
import { ticketVencido } from '@/lib/domain/loops';
import type { Escuela, EstadoTicket, Ticket } from '@/lib/types';

const ESTADOS_TICKET: EstadoTicket[] = ['Nuevo', 'En curso', 'Resuelto'];
const campo = 'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-900';

interface TicketDetalleProps {
  ticket: Ticket;
  escuela: Escuela;
  onCerrar: () => void;
  onResponder: () => void;
  onCrearLoop: () => void;
}

export function TicketDetalle({ ticket, escuela, onCerrar, onResponder, onCrearLoop }: TicketDetalleProps) {
  const { datos, ctx, ejecutar } = useHub();
  const contacto = datos.contactos.find((c) => c.id === ticket.contacto_id);
  const hilo = datos.ticketMensajes.filter((m) => m.ticket_id === ticket.id).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const vencido = ticketVencido(ticket);

  return (
    <Modal titulo={ticket.asunto} onCerrar={onCerrar} ancho="max-w-2xl">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <EstadoTicketBadge estado={ticket.estado} vencido={vencido} />
          <span>
            {escuela.nombre} · {contacto?.nombre ?? 'Contacto desconocido'}
            {contacto?.cargo ? ` (${contacto.cargo})` : ''}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Estado
            <select
              value={ticket.estado}
              onChange={(e) => ejecutar(() => cambiarEstadoTicket(ctx, ticket, e.target.value as EstadoTicket), 'Estado actualizado')}
              className={`${campo} normal-case tracking-normal`}
            >
              {ESTADOS_TICKET.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Owner
            <select
              value={ticket.owner_id ?? ''}
              onChange={(e) => ejecutar(() => cambiarOwnerTicket(ctx, ticket, e.target.value), 'Owner actualizado')}
              className={`${campo} normal-case tracking-normal`}
            >
              {datos.equipo.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs text-slate-500">
            {contacto?.nombre ?? 'Contacto'} · {fechaHora(ticket.creado)}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-800">{ticket.mensaje}</p>
        </div>

        {hilo.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Respuestas</h3>
            {hilo.map((m) => (
              <div key={m.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">
                  {m.autor} · {fechaHora(m.fecha)}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-800">{m.cuerpo}</p>
              </div>
            ))}
          </section>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Boton variante="primario" onClick={onResponder} disabled={!contacto?.email}>
              Responder
            </Boton>
            <Boton variante="secundario" onClick={onCrearLoop}>
              Crear loop desde este ticket
            </Boton>
          </div>
          <Enlace href={rutaEscuela(escuela, 'interacciones')} className="text-xs text-slate-600 underline">
            Ver en interacciones
          </Enlace>
        </div>
      </div>
    </Modal>
  );
}
