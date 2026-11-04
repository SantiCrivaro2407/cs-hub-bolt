import { useState } from 'react';
import { CrearLoopModal } from '@/components/loops/CrearLoopModal';
import { TicketDetalle } from '@/components/tickets/TicketDetalle';
import { EditorEmail } from '@/components/ui/EditorEmail';
import { EstadoTicketBadge } from '@/components/ui/Insignias';
import { useHub } from '@/context/HubContext';
import { responderTicket } from '@/lib/actions/tickets';
import { diasEntre, hacePlural } from '@/lib/domain/dates';
import { ticketVencido } from '@/lib/domain/loops';
import { navegar, urlConParams, useRuta } from '@/lib/router';
import type { EstadoTicket } from '@/lib/types';

const ESTADOS_TICKET: EstadoTicket[] = ['Nuevo', 'En curso', 'Resuelto'];
const ORDEN_ESTADO: Record<EstadoTicket, number> = { Nuevo: 0, 'En curso': 1, Resuelto: 2 };
const campo = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900';

export function TicketsPanel({ escuelaId }: { escuelaId?: string }) {
  const { datos, yo, ctx, ejecutar } = useHub();
  const { params } = useRuta();
  const [accion, setAccion] = useState<'responder' | 'loop' | null>(null);

  const escuelaFija = escuelaId ? datos.escuelas.find((e) => e.id === escuelaId) : undefined;
  const base = escuelaFija ? `/escuelas/${escuelaFija.slug}` : '/tickets';
  const estado = params.get('estado');
  const escuelaFiltro = escuelaFija ? escuelaFija.id : params.get('escuela');
  const owner = params.get('owner');
  const soloMios = params.get('mios') === '1';
  const ticketId = params.get('ticket');

  const cambiar = (cambios: Record<string, string | null>) => navegar(urlConParams(base, cambios, params));

  const visibles = datos.tickets
    .filter((t) => (escuelaFiltro ? t.escuela_id === escuelaFiltro : true))
    .filter((t) => (estado ? t.estado === estado : true))
    .filter((t) => (owner ? t.owner_id === owner : true))
    .filter((t) => (soloMios ? t.owner_id === yo.id : true))
    .sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || b.creado.localeCompare(a.creado));

  const ticket = datos.tickets.find((t) => t.id === ticketId);
  const escuelaDelTicket = ticket ? datos.escuelas.find((e) => e.id === ticket.escuela_id) : undefined;
  const contacto = ticket ? datos.contactos.find((c) => c.id === ticket.contacto_id) : undefined;
  const interaccionId = ticket ? datos.interacciones.find((i) => i.ticket_id === ticket.id)?.id : undefined;

  const cerrarDetalle = () => {
    setAccion(null);
    cambiar({ ticket: null });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-3">
        <select value={estado ?? ''} onChange={(e) => cambiar({ estado: e.target.value || null })} className={campo} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {ESTADOS_TICKET.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        {!escuelaFija && (
          <select value={escuelaFiltro ?? ''} onChange={(e) => cambiar({ escuela: e.target.value || null })} className={campo} aria-label="Filtrar por escuela">
            <option value="">Todas las escuelas</option>
            {datos.escuelas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        )}
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
          No hay tickets con esos filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Asunto</th>
                {!escuelaFija && <th className="px-4 py-3 font-medium">Escuela</th>}
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibles.map((t) => {
                const escuela = datos.escuelas.find((e) => e.id === t.escuela_id);
                const contactoFila = datos.contactos.find((c) => c.id === t.contacto_id);
                const owner = datos.equipo.find((m) => m.id === t.owner_id);
                return (
                  <tr key={t.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <button onClick={() => cambiar({ ticket: t.id })} className="text-left font-medium text-slate-900 hover:underline">
                        {t.asunto}
                      </button>
                    </td>
                    {!escuelaFija && <td className="px-4 py-3 text-slate-700">{escuela?.nombre ?? '—'}</td>}
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{contactoFila?.nombre ?? '—'}</td>
                    <td className="px-4 py-3">
                      <EstadoTicketBadge estado={t.estado} vencido={ticketVencido(t)} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{owner?.nombre ?? 'Sin owner'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{hacePlural(diasEntre(t.creado))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {ticket && escuelaDelTicket && !accion && (
        <TicketDetalle
          ticket={ticket}
          escuela={escuelaDelTicket}
          onCerrar={cerrarDetalle}
          onResponder={() => setAccion('responder')}
          onCrearLoop={() => setAccion('loop')}
        />
      )}
      {ticket && escuelaDelTicket && accion === 'responder' && contacto?.email && (
        <EditorEmail
          titulo={`Responder · ${ticket.asunto}`}
          inicial={{ asunto: `Re: ${ticket.asunto}`, para: [contacto.email], cuerpo: '' }}
          paraEditable={false}
          textoBoton="Enviar respuesta"
          ofrecerResolver
          onEnviar={(envio, marcarResuelto) =>
            ejecutar(() => responderTicket(ctx, ticket, escuelaDelTicket, envio, marcarResuelto), 'Respuesta enviada')
          }
          onCerrar={() => setAccion(null)}
        />
      )}
      {ticket && escuelaDelTicket && accion === 'loop' && (
        <CrearLoopModal
          escuela={escuelaDelTicket}
          origen="ticket"
          origenInteraccionId={interaccionId}
          tituloInicial={ticket.asunto}
          onCerrar={() => setAccion(null)}
        />
      )}
    </div>
  );
}
