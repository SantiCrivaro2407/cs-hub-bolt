import { useState } from 'react';
import { CrearLoopModal } from '@/components/loops/CrearLoopModal';
import { TicketDetalle } from '@/components/tickets/TicketDetalle';
import { EditorEmail } from '@/components/ui/EditorEmail';
import { useHub } from '@/context/HubContext';
import { responderTicket } from '@/lib/actions/tickets';
import { diasEntre, hacePlural } from '@/lib/domain/dates';
import { ticketVencido } from '@/lib/domain/loops';
import { navegar, urlConParams, useRuta } from '@/lib/router';
import type { EstadoTicket } from '@/lib/types';

const ORDEN_ESTADO: Record<EstadoTicket, number> = { Nuevo: 0, 'En curso': 1, Resuelto: 2 };
const campo =
  'h-9 cursor-pointer rounded-md border border-input bg-background px-2.5 text-sm shadow-xs outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50';

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

  const contar = (e: EstadoTicket | null) => datos.tickets.filter((t) => (escuelaFiltro ? t.escuela_id === escuelaFiltro : true) && (e ? t.estado === e : true)).length;
  const pestanas: { valor: EstadoTicket | null; texto: string }[] = [
    { valor: 'Nuevo', texto: 'Nuevos' },
    { valor: 'En curso', texto: 'En curso' },
    { valor: 'Resuelto', texto: 'Resueltos' },
    { valor: null, texto: 'Todos' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
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
        <label className={`${campo} flex items-center gap-2`}>
          <input type="checkbox" checked={soloMios} onChange={(e) => cambiar({ mios: e.target.checked ? '1' : null })} className="accent-foreground" />
          Solo míos
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* Bandeja */}
        <div className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card ${ticket ? 'hidden lg:flex' : ''}`}>
          <div className="flex gap-1 overflow-x-auto border-b border-border px-2 pt-2" role="tablist" aria-label="Estado de los tickets">
            {pestanas.map((p) => {
              const activa = (estado ?? null) === p.valor;
              return (
                <button
                  key={p.texto}
                  role="tab"
                  aria-selected={activa}
                  onClick={() => cambiar({ estado: p.valor })}
                  className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 pb-2 pt-1 text-sm ${activa ? 'border-foreground font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  {p.texto}
                  {p.valor && <span className="text-xs tabular-nums text-muted-foreground">{contar(p.valor)}</span>}
                </button>
              );
            })}
          </div>
          {visibles.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No hay tickets acá.</p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
              {visibles.map((t) => {
                const escuela = datos.escuelas.find((e) => e.id === t.escuela_id);
                const contactoFila = datos.contactos.find((c) => c.id === t.contacto_id);
                const vencido = ticketVencido(t);
                const seleccionado = t.id === ticketId;
                const nuevo = t.estado === 'Nuevo';
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => {
                        setAccion(null);
                        cambiar({ ticket: t.id });
                      }}
                      aria-current={seleccionado ? 'true' : undefined}
                      className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left ${seleccionado ? 'bg-accent' : 'hover:bg-accent/50'}`}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className={`truncate text-sm ${nuevo ? 'font-semibold' : ''}`}>{contactoFila?.nombre ?? 'Contacto desconocido'}</span>
                        <span className={`shrink-0 text-xs tabular-nums ${vencido ? 'font-medium text-triage-support-fg' : 'text-muted-foreground'}`}>
                          {hacePlural(diasEntre(t.creado))}
                        </span>
                      </span>
                      <span className={`truncate text-sm ${nuevo ? 'font-medium text-foreground' : 'text-foreground/80'}`}>{t.asunto}</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {!escuelaFija && <span className="truncate">{escuela?.nombre}</span>}
                        {vencido && <span className="font-medium text-triage-support-fg">Sin respuesta</span>}
                        {!nuevo && <span>{t.estado}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Ticket abierto */}
        {ticket && escuelaDelTicket ? (
          <div className="min-w-0">
            <button onClick={cerrarDetalle} className="mb-3 text-sm text-muted-foreground underline underline-offset-4 lg:hidden">
              Volver a la bandeja
            </button>
            <TicketDetalle
              enLinea
              ticket={ticket}
              escuela={escuelaDelTicket}
              onCerrar={cerrarDetalle}
              onResponder={() => setAccion('responder')}
              onCrearLoop={() => setAccion('loop')}
            />
          </div>
        ) : (
          <div className="hidden items-center justify-center rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground lg:flex">
            Elegí un ticket de la lista para leerlo y responderlo.
          </div>
        )}
      </div>

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
