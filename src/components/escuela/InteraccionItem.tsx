import { useState } from 'react';
import { CalendarDays, ChevronRight, Mail, MailOpen, NotebookPen, PlayCircle, Ticket } from 'lucide-react';
import { Boton } from '@/components/ui/Boton';
import { EditorEmail } from '@/components/ui/EditorEmail';
import { Enlace } from '@/components/ui/Enlace';
import { Pill } from '@/components/ui/Insignias';
import { CrearLoopPanel } from '@/components/loops/CrearLoopPanel';
import { InteraccionDetalle } from '@/components/escuela/InteraccionDetalle';
import { useHub } from '@/context/HubContext';
import { enviarEmail } from '@/lib/actions/email';
import { fechaHora, horaMinuto } from '@/lib/domain/dates';
import { rutaEscuela } from '@/lib/domain/cartera';
import { HOSTS_READAI, urlSegura } from '@/lib/domain/urls';
import { emailEsDeStaff } from '@/lib/domain/email';
import type { Escuela, Interaccion, TipoInteraccion } from '@/lib/types';

const ETIQUETA_TIPO: Record<TipoInteraccion, string> = {
  email_recibido: 'Email recibido',
  email_enviado: 'Email enviado',
  reunion: 'Reunión',
  ticket: 'Ticket',
  nota: 'Nota',
  registro_interno: 'Registro interno',
};

const ICONO_TIPO = {
  email_recibido: Mail,
  email_enviado: MailOpen,
  reunion: CalendarDays,
  ticket: Ticket,
  nota: NotebookPen,
  registro_interno: NotebookPen,
} satisfies Record<TipoInteraccion, typeof Mail>;

type Accion = { tipo: 'responder' } | { tipo: 'loop'; actionItemId?: string; tituloInicial: string } | null;

interface Props {
  interaccion: Interaccion;
  escuela: Escuela;
  /** Dentro de un hilo: sin borde propio y con el asunto solo en el primer mensaje. */
  enHilo?: boolean;
  mostrarTitulo?: boolean;
  /** En un hilo, Responder / Crear loop van solo en el último mensaje recibido. */
  conAcciones?: boolean;
  /** Abre el detalle al montar (link directo desde un pendiente). */
  detalleInicial?: boolean;
}

export function InteraccionItem({ interaccion, escuela, enHilo = false, mostrarTitulo = true, conAcciones = true, detalleInicial = false }: Props) {
  const { datos, ctx, ejecutar } = useHub();
  const [accion, setAccion] = useState<Accion>(null);
  const Icono = ICONO_TIPO[interaccion.tipo];
  const contactosEscuela = datos.contactos.filter((c) => c.escuela_id === escuela.id && c.email);
  const contactoAutor = contactosEscuela.find((c) => c.nombre === interaccion.autor);
  const interno = interaccion.tipo === 'registro_interno';
  const enlaceReadAI = urlSegura(interaccion.enlace, HOSTS_READAI);
  const [detalle, setDetalle] = useState(detalleInicial);
  // Se responde al remitente si es del staff de la escuela (emails traídos de Gmail); si no, a los contactos.
  const remitente = interaccion.de?.match(/[^\s<>"]+@[^\s<>"]+/)?.[0]?.toLowerCase();
  const paraRespuesta =
    remitente && emailEsDeStaff(remitente, escuela.dominio_staff)
      ? [remitente]
      : contactoAutor?.email
        ? [contactoAutor.email]
        : contactosEscuela.map((c) => c.email as string);
  const abrirAccion = (nueva: Accion) => {
    setDetalle(false);
    setAccion(nueva);
  };

  return (
    <article className={enHilo ? 'flex gap-4 py-4' : `flex gap-4 rounded-xl border border-slate-200 p-4 ${interno ? 'bg-slate-50' : 'bg-white'}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${interno ? 'bg-slate-200 text-slate-600' : 'bg-slate-900 text-white'}`}>
        <Icono className="h-4 w-4" aria-hidden />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Pill tono={interno ? 'neutro' : 'azul'}>{ETIQUETA_TIPO[interaccion.tipo]}</Pill>
          <span>
            {interaccion.autor} · {enHilo ? fechaHora(interaccion.fecha) : horaMinuto(interaccion.fecha)}
          </span>
          {interaccion.duracion_min !== null && <span>· {interaccion.duracion_min} min</span>}
          {interaccion.origen && interaccion.origen !== 'manual' && <Pill>{interaccion.origen === 'gmail' ? 'Gmail' : 'Read AI'}</Pill>}
        </div>
        {mostrarTitulo ? (
          <button onClick={() => setDetalle(true)} className="group flex items-start justify-between gap-2 text-left" aria-label={`Ver detalle: ${interaccion.titulo}`}>
            <h3 className={`text-sm font-medium group-hover:underline ${interno ? 'text-slate-600' : 'text-slate-900'}`}>{interaccion.titulo}</h3>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />
          </button>
        ) : (
          <button onClick={() => setDetalle(true)} className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline" aria-label={`Ver detalle: ${interaccion.titulo}`}>
            Ver detalle
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
        {(interaccion.de || (interaccion.para?.length ?? 0) > 0) && (
          <p className="text-xs text-muted-foreground">
            {interaccion.de && <>De: {interaccion.de}</>}
            {interaccion.de && (interaccion.para?.length ?? 0) > 0 && ' · '}
            {(interaccion.para?.length ?? 0) > 0 && <>{interaccion.tipo === 'reunion' ? 'Participantes' : 'Para'}: {interaccion.para?.join(', ')}</>}
          </p>
        )}
        {interaccion.cuerpo && <p className="line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{interaccion.cuerpo}</p>}
        {enlaceReadAI && (
          <a href={enlaceReadAI} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium underline underline-offset-2">
            <PlayCircle className="h-4 w-4" aria-hidden />
            Ver grabación en Read AI
          </a>
        )}

        {interaccion.action_items.length > 0 && (
          <ul className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3">
            {interaccion.action_items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-800">
                <span>{item.texto}</span>
                {item.loop_id ? (
                  <Enlace href={rutaEscuela(escuela, 'loops', { loop: item.loop_id })} className="text-xs font-medium text-slate-700 underline">
                    Ver loop {item.loop_id}
                  </Enlace>
                ) : (
                  <Boton variante="secundario" className="py-1 text-xs" onClick={() => setAccion({ tipo: 'loop', actionItemId: item.id, tituloInicial: item.texto })}>
                    Crear loop
                  </Boton>
                )}
              </li>
            ))}
          </ul>
        )}

        {conAcciones && (interaccion.tipo === 'email_recibido' || interaccion.tipo === 'ticket') && (
          <div className="flex flex-wrap gap-2 pt-1">
            {interaccion.tipo === 'email_recibido' && (
              <>
                <Boton variante="secundario" className="py-1 text-xs" onClick={() => setAccion({ tipo: 'responder' })}>
                  Responder
                </Boton>
                <Boton variante="secundario" className="py-1 text-xs" onClick={() => setAccion({ tipo: 'loop', tituloInicial: interaccion.titulo })}>
                  Crear loop
                </Boton>
              </>
            )}
            {interaccion.tipo === 'ticket' && interaccion.ticket_id && (
              <Enlace href={rutaEscuela(escuela, 'tickets', { ticket: interaccion.ticket_id })} className="text-xs font-medium text-slate-700 underline">
                Ver ticket
              </Enlace>
            )}
          </div>
        )}
      </div>

      {detalle && (
        <InteraccionDetalle
          interaccion={interaccion}
          escuela={escuela}
          etiquetaTipo={ETIQUETA_TIPO[interaccion.tipo]}
          enlaceReadAI={enlaceReadAI}
          onCerrar={() => setDetalle(false)}
          onResponder={interaccion.tipo === 'email_recibido' ? () => abrirAccion({ tipo: 'responder' }) : undefined}
          onCrearLoop={(item) =>
            abrirAccion(item ? { tipo: 'loop', actionItemId: item.id, tituloInicial: item.texto } : { tipo: 'loop', tituloInicial: interaccion.titulo })
          }
        />
      )}
      {accion?.tipo === 'responder' && (
        <EditorEmail
          titulo={`Responder · ${interaccion.titulo}`}
          inicial={{
            asunto: `Re: ${interaccion.titulo}`,
            para: paraRespuesta,
            cuerpo: '',
          }}
          paraEditable={false}
          textoBoton="Enviar email"
          citado={{ autor: interaccion.autor, fecha: interaccion.fecha, cuerpo: interaccion.cuerpo }}
          onEnviar={(envio) => ejecutar(() => enviarEmail(ctx, escuela, envio, { loopId: interaccion.loop_id, respondeA: interaccion.id }), 'Email enviado')}
          onCerrar={() => setAccion(null)}
        />
      )}
      {accion?.tipo === 'loop' && (
        <CrearLoopPanel
          escuela={escuela}
          origen={interaccion.tipo === 'reunion' ? 'reunion' : interaccion.tipo === 'ticket' ? 'ticket' : 'email'}
          origenInteraccionId={interaccion.id}
          ticketId={interaccion.ticket_id ?? undefined}
          tituloInicial={accion.tituloInicial}
          actionItem={accion.actionItemId ? { id: accion.actionItemId, texto: accion.tituloInicial } : undefined}
          onCerrar={() => setAccion(null)}
        />
      )}
    </article>
  );
}
