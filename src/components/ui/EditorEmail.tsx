import { useState, type FormEvent } from 'react';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import type { EnvioEmail } from '@/lib/actions/email';

interface EditorEmailProps {
  titulo: string;
  inicial: EnvioEmail;
  paraEditable: boolean;
  textoBoton: string;
  ofrecerResolver?: boolean;
  onEnviar: (envio: EnvioEmail, marcarResuelto: boolean) => Promise<boolean>;
  onCerrar: () => void;
}

const campo = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900';

export function EditorEmail({ titulo, inicial, paraEditable, textoBoton, ofrecerResolver = false, onEnviar, onCerrar }: EditorEmailProps) {
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
    <Modal titulo={titulo} onCerrar={onCerrar} ancho="max-w-2xl">
      <form onSubmit={enviar} className="flex flex-col gap-4">
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
          <textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} rows={8} className={`${campo} resize-y`} />
        </label>
        {ofrecerResolver && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={marcarResuelto} onChange={(e) => setMarcarResuelto(e.target.checked)} className="accent-slate-900" />
            Marcar como resuelto
          </label>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Boton variante="fantasma" type="button" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="primario" type="submit" disabled={!valido || enviando}>
            {enviando ? 'Enviando…' : textoBoton}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
