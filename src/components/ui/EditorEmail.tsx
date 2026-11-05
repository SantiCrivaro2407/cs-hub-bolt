import { useState, type FormEvent } from 'react';
import { Boton } from '@/components/ui/Boton';
import { PanelLateral } from '@/components/ui/PanelLateral';
import type { EnvioEmail } from '@/lib/actions/email';
import { fechaHora } from '@/lib/domain/dates';

/** El mensaje al que se responde, para tenerlo a la vista mientras se escribe. */
export interface MensajeCitado {
  autor: string;
  fecha?: string;
  cuerpo: string;
}

interface EditorEmailProps {
  titulo: string;
  inicial: EnvioEmail;
  paraEditable: boolean;
  textoBoton: string;
  ofrecerResolver?: boolean;
  citado?: MensajeCitado;
  onEnviar: (envio: EnvioEmail, marcarResuelto: boolean) => Promise<boolean>;
  onCerrar: () => void;
}

const campo = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900';

export function EditorEmail({ titulo, inicial, paraEditable, textoBoton, ofrecerResolver = false, citado, onEnviar, onCerrar }: EditorEmailProps) {
  const [para, setPara] = useState(inicial.para.join(', '));
  const [asunto, setAsunto] = useState(inicial.asunto);
  const [cuerpo, setCuerpo] = useState(inicial.cuerpo);
  const [marcarResuelto, setMarcarResuelto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const destinatarios = para
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  const valido = destinatarios.length > 0 && asunto.trim() !== '' && cuerpo.trim() !== '';

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!valido || enviando) return;
    setEnviando(true);
    const ok = await onEnviar({ asunto: asunto.trim(), cuerpo: cuerpo.trim(), para: destinatarios }, marcarResuelto);
    setEnviando(false);
    if (ok) onCerrar();
  };

  return (
    <PanelLateral titulo={titulo} onCerrar={onCerrar}>
      <form onSubmit={enviar} className="flex min-h-full flex-col gap-4">
        {citado && citado.cuerpo.trim() !== '' && (
          <blockquote className="rounded-lg border-l-2 border-slate-300 bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">
              {citado.autor}
              {citado.fecha ? ` · ${fechaHora(citado.fecha)}` : ''}
            </p>
            <p className="mt-1 line-clamp-6 whitespace-pre-line text-sm text-slate-700">{citado.cuerpo}</p>
          </blockquote>
        )}
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Para
          {paraEditable ? (
            <input value={para} onChange={(e) => setPara(e.target.value)} className={campo} placeholder="nombre@dominio-de-la-escuela" />
          ) : (
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-normal text-slate-700">{para}</span>
          )}
          <span className="text-xs font-normal text-slate-500">Solo se puede escribir a direcciones de staff de la escuela.</span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Asunto
          <input value={asunto} onChange={(e) => setAsunto(e.target.value)} className={campo} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Mensaje
          <textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} rows={12} autoFocus className={`${campo} resize-y`} />
        </label>
        {ofrecerResolver && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={marcarResuelto} onChange={(e) => setMarcarResuelto(e.target.checked)} className="accent-slate-900" />
            Marcar como resuelto
          </label>
        )}
        <div className="mt-auto flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Boton variante="fantasma" type="button" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="primario" type="submit" disabled={!valido || enviando}>
            {enviando ? 'Enviando…' : textoBoton}
          </Boton>
        </div>
      </form>
    </PanelLateral>
  );
}
