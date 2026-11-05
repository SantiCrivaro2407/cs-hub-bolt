import { useState, type FormEvent } from 'react';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { useHub } from '@/context/HubContext';
import { crearLoop, type NuevoLoopInput } from '@/lib/actions/loops';
import type { Escuela, OrigenLoop } from '@/lib/types';
import { etiquetaMiembro } from '@/lib/domain/cartera';

interface CrearLoopModalProps {
  escuela: Escuela;
  origen: OrigenLoop;
  origenInteraccionId?: string;
  tituloInicial?: string;
  actionItemId?: string;
  onCerrar: () => void;
}

const campo = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900';

export function CrearLoopModal({ escuela, origen, origenInteraccionId, tituloInicial = '', actionItemId, onCerrar }: CrearLoopModalProps) {
  const { datos, yo, ctx, ejecutar } = useHub();
  const contactos = datos.contactos.filter((c) => c.escuela_id === escuela.id);
  const [titulo, setTitulo] = useState(tituloInicial);

  const [quePidio, setQuePidio] = useState('');
  const [quienEsperaId, setQuienEsperaId] = useState('');
  const [ownerId, setOwnerId] = useState(yo.id);
  const [guardando, setGuardando] = useState(false);

  const valido = titulo.trim() !== '' && quePidio.trim() !== '';

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    if (!valido || guardando) return;
    const input: NuevoLoopInput = {
      titulo: titulo.trim(),
      quePidio: quePidio.trim(),
      quienEsperaId: quienEsperaId || null,
      ownerId,
      origen,
      origenInteraccionId: origenInteraccionId ?? null,
      actionItemId,
    };
    setGuardando(true);
    const ok = await ejecutar(() => crearLoop(ctx, escuela, input), 'Loop creado');
    setGuardando(false);
    if (ok) onCerrar();
  };

  return (
    <Modal titulo="Nuevo loop" onCerrar={onCerrar}>
      <form onSubmit={crear} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Título
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={campo} autoFocus />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Qué pidió la escuela
          <textarea value={quePidio} onChange={(e) => setQuePidio(e.target.value)} rows={3} className={`${campo} resize-y`} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Quién espera
            <select value={quienEsperaId} onChange={(e) => setQuienEsperaId(e.target.value)} className={campo}>
              <option value="">Sin asignar</option>
              {contactos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Owner
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={campo}>
              {datos.equipo.map((m) => (
                <option key={m.id} value={m.id}>
                  {etiquetaMiembro(datos.equipo, m)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Boton variante="fantasma" type="button" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="primario" type="submit" disabled={!valido || guardando}>
            {guardando ? 'Creando…' : 'Crear loop'}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
