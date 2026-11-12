import { ExternalLink, PlayCircle } from 'lucide-react';
import { Boton } from '@/components/ui/Boton';
import { Enlace } from '@/components/ui/Enlace';
import { Pill } from '@/components/ui/Insignias';
import { PanelLateral } from '@/components/ui/PanelLateral';
import { useHub } from '@/context/HubContext';
import { rutaEscuela } from '@/lib/domain/cartera';
import { fechaLarga, horaMinuto } from '@/lib/domain/dates';
import type { Escuela, Interaccion } from '@/lib/types';

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{etiqueta}</dt>
      <dd className="break-words text-sm">{children}</dd>
    </div>
  );
}

interface Props {
  interaccion: Interaccion;
  escuela: Escuela;
  etiquetaTipo: string;
  enlaceReadAI: string | null;
  onCerrar: () => void;
  onResponder?: () => void;
  onCrearLoop: (actionItem?: { id: string; texto: string }) => void;
}

/** Todo lo que se sabe de una interacción: metadatos, texto completo, action items, vínculos y acciones. */
export function InteraccionDetalle({ interaccion, escuela, etiquetaTipo, enlaceReadAI, onCerrar, onResponder, onCrearLoop }: Props) {
  const { datos } = useHub();
  const reunion = interaccion.tipo === 'reunion';
  const para = interaccion.para ?? [];
  const loop = datos.loops.find((l) => l.id === interaccion.loop_id);
  const ticket = datos.tickets.find((t) => t.id === interaccion.ticket_id);

  return (
    <PanelLateral titulo={interaccion.titulo} onCerrar={onCerrar}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tono="azul">{etiquetaTipo}</Pill>
          {interaccion.origen && interaccion.origen !== 'manual' && <Pill>{interaccion.origen === 'gmail' ? 'Gmail' : 'Read AI'}</Pill>}
        </div>

        {reunion &&
          (enlaceReadAI ? (
            <a
              href={enlaceReadAI}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              <PlayCircle className="h-4 w-4" aria-hidden />
              Ver grabación en Read AI
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Esta reunión no tiene grabación de Read AI.</p>
          ))}

        <dl className="grid gap-3 sm:grid-cols-2">
          <Dato etiqueta="Fecha">
            {fechaLarga(interaccion.fecha)} · {horaMinuto(interaccion.fecha)}
          </Dato>
          <Dato etiqueta={reunion ? 'Registrada por' : 'Autor'}>{interaccion.autor}</Dato>
          {interaccion.de && <Dato etiqueta="De">{interaccion.de}</Dato>}
          {para.length > 0 && <Dato etiqueta={reunion ? 'Participantes' : 'Para'}>{para.join(', ')}</Dato>}
          {interaccion.duracion_min !== null && <Dato etiqueta="Duración">{interaccion.duracion_min} min</Dato>}
          {loop && (
            <Dato etiqueta="Loop">
              <Enlace href={rutaEscuela(escuela, 'loops', { loop: loop.id })} className="underline" onClick={onCerrar}>
                {loop.id} · {loop.titulo}
              </Enlace>
            </Dato>
          )}
          {ticket && (
            <Dato etiqueta="Ticket">
              <Enlace href={rutaEscuela(escuela, 'tickets', { ticket: ticket.id })} className="underline" onClick={onCerrar}>
                {ticket.asunto}
              </Enlace>
            </Dato>
          )}
        </dl>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{reunion ? 'Resumen' : 'Contenido'}</h3>
          {interaccion.cuerpo ? (
            <p className="whitespace-pre-line rounded-lg bg-muted/40 p-3 text-sm leading-relaxed">{interaccion.cuerpo}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Sin contenido.</p>
          )}
        </section>

        {interaccion.action_items.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action items</h3>
            <ul className="flex flex-col gap-2">
              {interaccion.action_items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                  <span>{item.texto}</span>
                  {item.loop_id ? (
                    <Enlace href={rutaEscuela(escuela, 'loops', { loop: item.loop_id })} className="text-xs font-medium underline" onClick={onCerrar}>
                      Ver loop {item.loop_id}
                    </Enlace>
                  ) : (
                    <Boton variante="secundario" className="py-1 text-xs" onClick={() => onCrearLoop(item)}>
                      Crear loop
                    </Boton>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {(onResponder || interaccion.tipo === 'email_recibido') && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {onResponder && (
              <Boton variante="primario" onClick={onResponder}>
                Responder
              </Boton>
            )}
            <Boton variante="secundario" onClick={() => onCrearLoop()}>
              Crear loop
            </Boton>
          </div>
        )}
      </div>
    </PanelLateral>
  );
}
