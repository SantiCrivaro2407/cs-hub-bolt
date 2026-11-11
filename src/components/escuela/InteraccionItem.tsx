import { useState } from 'react';
import { CalendarDays, Mail, MailOpen, NotebookPen, Ticket } from 'lucide-react';
import { Boton } from '@/components/ui/Boton';
import { EditorEmail } from '@/components/ui/EditorEmail';
import { Enlace } from '@/components/ui/Enlace';
import { Pill } from '@/components/ui/Insignias';
import { CrearLoopModal } from '@/components/loops/CrearLoopModal';
import { useHub } from '@/context/HubContext';
import { enviarEmail } from '@/lib/actions/email';
import { horaMinuto } from '@/lib/domain/dates';
import { rutaEscuela } from '@/lib/domain/cartera';
import { HOSTS_READAI, urlSegura } from '@/lib/domain/urls';
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

export function InteraccionItem({ interaccion, escuela }: { interaccion: Interaccion; escuela: Escuela }) {
  const { datos, ctx, ejecutar } = useHub();
  const [accion, setAccion] = useState<Accion>(null);
  const Icono = ICONO_TIPO[interaccion.tipo];
  const contactosEscuela = datos.contactos.filter((c) => c.escuela_id === escuela.id && c.email);
  const contactoAutor = contactosEscuela.find((c) => c.nombre === interaccion.autor);
  const interno = interaccion.tipo === 'registro_interno';
  const enlaceReadAI = urlSegura(interaccion.enlace, HOSTS_READAI);
  const [expandido, setExpandido] = useState(false);
  const largo = interaccion.cuerpo.length > 600;

  return (
    <article className={`flex gap-4 rounded-xl border border-slate-200 p-4 ${interno ? 'bg-slate-50' : 'bg-white'}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${interno ? 'bg-slate-200 text-slate-600' : 'bg-slate-900 text-white'}`}>
        <Icono className="h-4 w-4" aria-hidden />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Pill tono={interno ? 'neutro' : 'azul'}>{ETIQUETA_TIPO[interaccion.tipo]}</Pill>
          <span>
            {interaccion.autor} · {horaMinuto(interaccion.fecha)}
          </span>
          {interaccion.duracion_min !== null && <span>· {interaccion.duracion_min} min</span>}
          {interaccion.origen && interaccion.origen !== 'manual' && <Pill>{interaccion.origen === 'gmail' ? 'Gmail' : 'Read AI'}</Pill>}
        </div>
        <h3 className={`text-sm font-medium ${interno ? 'text-slate-600' : 'text-slate-900'}`}>{interaccion.titulo}</h3>
        {(interaccion.de || (interaccion.para?.length ?? 0) > 0) && (
          <p className="text-xs text-muted-foreground">
            {interaccion.de && <>De: {interaccion.de}</>}
            {interaccion.de && (interaccion.para?.length ?? 0) > 0 && ' · '}
            {(interaccion.para?.length ?? 0) > 0 && <>{interaccion.tipo === 'reunion' ? 'Participantes' : 'Para'}: {interaccion.para?.join(', ')}</>}
          </p>
        )}
        {interaccion.cuerpo && (
          <div>
            <p className={`whitespace-pre-line text-sm leading-relaxed text-slate-700 ${largo && !expandido ? 'line-clamp-6' : ''}`}>{interaccion.cuerpo}</p>
            {largo && (
              <button onClick={() => setExpandido(!expandido)} className="mt-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                {expandido ? 'Ver menos' : 'Ver email completo'}
              </button>
            )}
          </div>
        )}
        {enlaceReadAI && (
          <a href={enlaceReadAI} target="_blank" rel="noreferrer" className="w-fit text-sm font-medium underline underline-offset-2">
            Ver reporte en Read AI
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

        {(interaccion.tipo === 'email_recibido' || interaccion.tipo === 'ticket') && (
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

      {accion?.tipo === 'responder' && (
        <EditorEmail
          titulo={`Responder · ${interaccion.titulo}`}
          inicial={{
            asunto: `Re: ${interaccion.titulo}`,
            para: contactoAutor?.email ? [contactoAutor.email] : contactosEscuela.map((c) => c.email as string),
            cuerpo: '',
          }}
          paraEditable={false}
          textoBoton="Enviar email"
          citado={{ autor: interaccion.autor, fecha: interaccion.fecha, cuerpo: interaccion.cuerpo }}
          onEnviar={(envio) => ejecutar(() => enviarEmail(ctx, escuela, envio, { loopId: interaccion.loop_id }), 'Email enviado')}
          onCerrar={() => setAccion(null)}
        />
      )}
      {accion?.tipo === 'loop' && (
        <CrearLoopModal
          escuela={escuela}
          origen={interaccion.tipo === 'reunion' ? 'reunion' : 'email'}
          origenInteraccionId={interaccion.id}
          tituloInicial={accion.tituloInicial}
          actionItemId={accion.actionItemId}
          onCerrar={() => setAccion(null)}
        />
      )}
    </article>
  );
}
