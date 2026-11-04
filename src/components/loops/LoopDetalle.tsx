import { useState } from 'react';
import { IssuesDelLoop } from '@/components/loops/IssuesDelLoop';
import { Boton } from '@/components/ui/Boton';
import { EditorEmail } from '@/components/ui/EditorEmail';
import { EstadoLoopBadge } from '@/components/ui/Insignias';
import { useHub } from '@/context/HubContext';
import { comentarLoop, cambiarOwnerLoop, responderLoop } from '@/lib/actions/loops';
import { diasEntre, fechaHora, hacePlural } from '@/lib/domain/dates';
import { ETIQUETA_ORIGEN, loopVencido } from '@/lib/domain/loops';
import type { Escuela, Loop } from '@/lib/types';

const campo = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900';

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{etiqueta}</dt>
      <dd className="text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export function LoopDetalle({ loop, escuela }: { loop: Loop; escuela: Escuela }) {
  const { datos, ctx, ejecutar } = useHub();
  const [responder, setResponder] = useState(false);
  const [comentario, setComentario] = useState('');
  const quienEspera = datos.contactos.find((c) => c.id === loop.quien_espera);
  const historial = datos.loopEstados.filter((e) => e.loop_id === loop.id).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const actividad = datos.interacciones.filter((i) => i.loop_id === loop.id).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const cerrado = loop.estado === 'Closed';
  const listo = loop.estado === 'Ready to reply';

  const comentar = async () => {
    if (comentario.trim() === '') return;
    const ok = await ejecutar(() => comentarLoop(ctx, loop, comentario.trim()), 'Comentario agregado');
    if (ok) setComentario('');
  };

  return (
    <div className="flex flex-col gap-6 border-t border-slate-200 bg-slate-50/60 p-5">
      {listo && (
        <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-emerald-900">Todas las issues están resueltas. Ya podés responderle a la escuela.</p>
          <Boton variante="primario" onClick={() => setResponder(true)}>
            Responder
          </Boton>
        </div>
      )}

      <dl className="grid gap-4 sm:grid-cols-2">
        <Dato etiqueta="Qué pidió la escuela">{loop.que_pidio}</Dato>
        <Dato etiqueta="Quién espera">{quienEspera ? `${quienEspera.nombre}${quienEspera.cargo ? ` · ${quienEspera.cargo}` : ''}` : 'Sin asignar'}</Dato>
        <Dato etiqueta="Origen">{ETIQUETA_ORIGEN[loop.origen]}</Dato>
        <Dato etiqueta="Creado">
          {hacePlural(diasEntre(loop.creado))} · {fechaHora(loop.creado)}
          {loopVencido(loop) && <span className="ml-2 font-medium text-rose-700">Vencido</span>}
        </Dato>
        <Dato etiqueta="Estado">
          <EstadoLoopBadge estado={loop.estado} />
        </Dato>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Owner</span>
          <select
            value={loop.owner_id ?? ''}
            onChange={(e) => ejecutar(() => cambiarOwnerLoop(ctx, loop, e.target.value), 'Owner actualizado')}
            className="w-fit rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-900"
          >
            {datos.equipo.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
      </dl>

      {!cerrado && !listo && (
        <div>
          <Boton variante="secundario" onClick={() => setResponder(true)}>
            Responder a la escuela
          </Boton>
        </div>
      )}

      <IssuesDelLoop loop={loop} escuela={escuela} />

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Historial de estados</h3>
        <ol className="flex flex-col gap-2 border-l-2 border-slate-200 pl-4">
          {historial.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <EstadoLoopBadge estado={h.estado} />
              <span className="text-xs text-slate-500">{fechaHora(h.fecha)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actividad</h3>
        {actividad.length === 0 && <p className="text-sm text-slate-500">Sin actividad todavía.</p>}
        <ul className="flex flex-col gap-2">
          {actividad.map((i) => (
            <li key={i.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">
                {i.autor} · {fechaHora(i.fecha)}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">{i.titulo}</p>
              {i.cuerpo && <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{i.cuerpo}</p>}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2">
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={2}
            placeholder="Escribí un comentario interno"
            aria-label="Comentario interno"
            className={`${campo} resize-y`}
          />
          <div className="flex justify-end">
            <Boton variante="secundario" onClick={comentar} disabled={comentario.trim() === ''}>
              Comentar
            </Boton>
          </div>
        </div>
      </section>

      {responder && (
        <EditorEmail
          titulo={`Responder · ${loop.titulo}`}
          inicial={{
            asunto: `Re: ${loop.titulo}`,
            para: quienEspera?.email ? [quienEspera.email] : [],
            cuerpo: '',
          }}
          paraEditable={false}
          textoBoton="Enviar y cerrar loop"
          onEnviar={(envio) => ejecutar(() => responderLoop(ctx, loop, escuela, envio), 'Respuesta enviada y loop cerrado')}
          onCerrar={() => setResponder(false)}
        />
      )}
    </div>
  );
}
