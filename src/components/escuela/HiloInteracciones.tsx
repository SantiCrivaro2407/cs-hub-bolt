import { useState } from 'react';
import { ChevronRight, MessagesSquare } from 'lucide-react';
import { InteraccionItem } from '@/components/escuela/InteraccionItem';
import { PanelLateral } from '@/components/ui/PanelLateral';
import { fechaHora } from '@/lib/domain/dates';
import { asuntoDelHilo, type Hilo } from '@/lib/domain/hilos';
import type { Escuela } from '@/lib/types';

interface Props {
  hilo: Hilo;
  escuela: Escuela;
  /** Interacción a abrir al montar (link directo desde un pendiente). */
  abrirId?: string | null;
}

/**
 * Una conversación (email, ticket y sus respuestas). En la lista es una tarjeta compacta con el último mensaje;
 * al tocarla se abre a la derecha con todos los mensajes, del más viejo al más nuevo.
 */
export function HiloInteracciones({ hilo, escuela, abrirId }: Props) {
  const { mensajes, ultimo } = hilo;
  const contieneAbierta = !!abrirId && mensajes.some((m) => m.id === abrirId);
  const [abierto, setAbierto] = useState(contieneAbierta && mensajes.length > 1);

  if (mensajes.length === 1) return <InteraccionItem interaccion={mensajes[0]} escuela={escuela} detalleInicial={contieneAbierta} />;

  const asunto = asuntoDelHilo(hilo);
  // Responder / Crear loop solo en el último mensaje de la escuela (o el ticket): la respuesta sale en el mismo hilo.
  const ultimoRecibido = [...mensajes].reverse().find((m) => m.tipo === 'email_recibido' || m.tipo === 'ticket');
  const participantes = [...new Set(mensajes.map((m) => m.autor))];

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="group flex w-full gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:bg-accent/40"
        aria-label={`Abrir conversación: ${asunto}`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
          <MessagesSquare className="h-4 w-4" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">{mensajes.length} mensajes</span>
            <span className="truncate">{participantes.join(', ')}</span>
            <span>· {fechaHora(ultimo.fecha)}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-900 group-hover:underline">{asunto}</h3>
          {ultimo.cuerpo && (
            <p className="line-clamp-2 text-sm text-slate-600">
              <span className="font-medium text-slate-700">{ultimo.autor}:</span> {ultimo.cuerpo}
            </p>
          )}
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />
      </button>

      {abierto && (
        <PanelLateral titulo={asunto} onCerrar={() => setAbierto(false)}>
          <p className="text-xs text-muted-foreground">
            {mensajes.length} mensajes · {participantes.join(', ')}
          </p>
          <ol className="divide-y divide-slate-100">
            {mensajes.map((m) => (
              <li key={m.id}>
                <InteraccionItem interaccion={m} escuela={escuela} enHilo mostrarTitulo={false} conAcciones={m.id === ultimoRecibido?.id} />
              </li>
            ))}
          </ol>
        </PanelLateral>
      )}
    </>
  );
}
