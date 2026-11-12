import { useState } from 'react';
import { ExternalLink, PlayCircle } from 'lucide-react';
import { Boton } from '@/components/ui/Boton';
import { Enlace } from '@/components/ui/Enlace';
import { EstadoTicketBadge } from '@/components/ui/Insignias';
import { X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useHub } from '@/context/HubContext';
import { cambiarEstadoTicket, cambiarOwnerTicket } from '@/lib/actions/tickets';
import { rutaEscuela, etiquetaMiembro } from '@/lib/domain/cartera';
import { diasEntre, fechaHora, hacePlural } from '@/lib/domain/dates';
import { ticketVencido } from '@/lib/domain/loops';
import { HOSTS_POSTHOG, urlSegura } from '@/lib/domain/urls';
import type { Escuela, EstadoTicket, HubData, Ticket } from '@/lib/types';

const ESTADOS_TICKET: EstadoTicket[] = ['Nuevo', 'En curso', 'Resuelto'];
const campo = 'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-900';

const MINUTOS_DUPLICADO = 5;

interface MensajeConversacion {
  id: string;
  deEquipo: boolean;
  autor: string;
  fecha: string;
  titulo?: string;
  de?: string | null;
  para?: string[];
  cuerpo: string;
}

const sinPrefijos = (asunto: string) => asunto.replace(/^((re|rv|fw|fwd)\s*:\s*)+/i, '').trim().toLowerCase();

/**
 * Todo lo que se habló sobre el ticket: los emails ligados (enviados desde el hub o traídos de Gmail
 * con el mismo asunto) y las respuestas del hilo que no tengan ya su email.
 */
function conversacionTicket(datos: HubData, ticket: Ticket): MensajeConversacion[] {
  const asunto = sinPrefijos(ticket.asunto);
  const emails = datos.interacciones.filter(
    (i) =>
      (i.tipo === 'email_enviado' || i.tipo === 'email_recibido') &&
      i.escuela_id === ticket.escuela_id &&
      (i.ticket_id === ticket.id || (i.origen === 'gmail' && i.fecha >= ticket.creado && sinPrefijos(i.titulo).includes(asunto))),
  );
  const yaEnEmail = (autor: string, fecha: string) =>
    emails.some(
      (e) => e.tipo === 'email_enviado' && e.autor === autor && Math.abs(new Date(e.fecha).getTime() - new Date(fecha).getTime()) < MINUTOS_DUPLICADO * 60_000,
    );

  return [
    ...emails.map((e) => ({
      id: e.id,
      deEquipo: e.tipo === 'email_enviado',
      autor: e.autor,
      fecha: e.fecha,
      titulo: e.titulo,
      de: e.de,
      para: e.para,
      cuerpo: e.cuerpo,
    })),
    ...datos.ticketMensajes
      .filter((m) => m.ticket_id === ticket.id && !yaEnEmail(m.autor, m.fecha))
      .map((m) => ({ id: m.id, deEquipo: true, autor: m.autor, fecha: m.fecha, cuerpo: m.cuerpo })),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function Grabacion({ url: guardada }: { url: string | null | undefined }) {
  const url = urlSegura(guardada, HOSTS_POSTHOG);
  if (!url) return <p className="text-sm text-slate-500">Este ticket no tiene grabación de PostHog.</p>;
  // Las grabaciones compartidas con "embed" se pueden ver acá mismo; el resto se abre en PostHog.
  const embebible = new URL(url).pathname.includes('/embedded/');
  return (
    <div className="flex flex-col gap-3">
      {embebible && (
        <iframe
          src={url}
          title="Grabación de la sesión"
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          className="aspect-video w-full rounded-lg border border-slate-200"
          allowFullScreen
        />
      )}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
      >
        <PlayCircle className="h-4 w-4" aria-hidden />
        Ver grabación en PostHog
        <ExternalLink className="h-3.5 w-3.5 text-slate-500" aria-hidden />
      </a>
    </div>
  );
}

function Mensaje({ mensaje }: { mensaje: MensajeConversacion }) {
  const [completo, setCompleto] = useState(false);
  const largo = mensaje.cuerpo.length > 400;
  return (
    <div className={`rounded-lg border p-3 ${mensaje.deEquipo ? 'border-slate-200 bg-white' : 'border-transparent bg-slate-50'}`}>
      <p className="text-xs text-slate-500">
        <span className="font-medium text-slate-700">{mensaje.autor}</span>
        {mensaje.deEquipo ? ' · equipo' : ''} · {fechaHora(mensaje.fecha)}
      </p>
      {mensaje.titulo && <p className="mt-1 text-sm font-medium text-slate-900">{mensaje.titulo}</p>}
      {(mensaje.de || (mensaje.para && mensaje.para.length > 0)) && (
        <p className="mt-1 text-xs text-slate-500">
          {mensaje.de ? `De: ${mensaje.de}` : ''}
          {mensaje.de && mensaje.para?.length ? ' · ' : ''}
          {mensaje.para?.length ? `Para: ${mensaje.para.join(', ')}` : ''}
        </p>
      )}
      <p className={`mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-800 ${largo && !completo ? 'line-clamp-6' : ''}`}>{mensaje.cuerpo}</p>
      {largo && (
        <button onClick={() => setCompleto(!completo)} className="mt-1 text-xs font-medium text-slate-600 underline">
          {completo ? 'Ver menos' : 'Ver email completo'}
        </button>
      )}
    </div>
  );
}

interface TicketDetalleProps {
  ticket: Ticket;
  escuela: Escuela;
  onCerrar: () => void;
  onResponder: () => void;
  onCrearLoop: () => void;
  /** En la bandeja el ticket se lee al lado de la lista, sin ventana emergente. */
  enLinea?: boolean;
}

export function TicketDetalle({ ticket, escuela, onCerrar, onResponder, onCrearLoop, enLinea = false }: TicketDetalleProps) {
  const { datos, ctx, ejecutar } = useHub();
  const contacto = datos.contactos.find((c) => c.id === ticket.contacto_id);
  const conversacion = conversacionTicket(datos, ticket);
  const ultimaRespuesta = conversacion.filter((m) => m.deEquipo).at(-1);
  const vencido = ticketVencido(ticket);

  const contenido = (
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
                  {etiquetaMiembro(datos.equipo, m)}
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

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Grabación</h3>
          <Grabacion url={ticket.grabacion_url} />
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conversación</h3>
            <p className={`text-xs font-medium ${ultimaRespuesta ? 'text-triage-progressing-fg' : 'text-triage-support-fg'}`}>
              {ultimaRespuesta
                ? `Respondió ${ultimaRespuesta.autor} ${hacePlural(diasEntre(ultimaRespuesta.fecha))}`
                : 'Nadie del equipo respondió todavía'}
            </p>
          </div>
          {conversacion.length === 0 ? (
            <p className="text-sm text-slate-500">Todavía no hay emails sobre este ticket.</p>
          ) : (
            conversacion.map((m) => <Mensaje key={m.id} mensaje={m} />)
          )}
        </section>

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
  );

  if (!enLinea) {
    return (
      <Modal titulo={ticket.asunto} onCerrar={onCerrar} ancho="max-w-2xl">
        {contenido}
      </Modal>
    );
  }

  return (
    <article aria-label={ticket.asunto} className="flex flex-col rounded-2xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-lg">{ticket.asunto}</h2>
        <button onClick={onCerrar} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Cerrar ticket">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="px-5 py-4">{contenido}</div>
    </article>
  );
}
