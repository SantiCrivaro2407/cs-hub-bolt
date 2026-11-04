import { useState, type FormEvent } from 'react';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { useHub } from '@/context/HubContext';
import { agregarNota } from '@/lib/actions/escuelas';
import type { Escuela } from '@/lib/types';

const campo = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900';

export function NuevaNotaModal({ escuela, onCerrar }: { escuela: Escuela; onCerrar: () => void }) {
  const { ctx, ejecutar } = useHub();
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const valido = titulo.trim() !== '' && cuerpo.trim() !== '';

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!valido || guardando) return;
    setGuardando(true);
    const ok = await ejecutar(() => agregarNota(ctx, escuela.id, titulo.trim(), cuerpo.trim()), 'Nota agregada');
    setGuardando(false);
    if (ok) onCerrar();
  };

  return (
    <Modal titulo="Agregar nota" onCerrar={onCerrar}>
      <form onSubmit={guardar} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Título
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={campo} autoFocus />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Nota
          <textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} rows={5} className={`${campo} resize-y`} />
        </label>
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Boton variante="fantasma" type="button" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="primario" type="submit" disabled={!valido || guardando}>
            Guardar nota
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
