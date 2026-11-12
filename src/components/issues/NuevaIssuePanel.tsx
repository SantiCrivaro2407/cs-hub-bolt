import { useState, type FormEvent } from 'react';
import { Boton } from '@/components/ui/Boton';
import { PanelLateral } from '@/components/ui/PanelLateral';
import { useHub } from '@/context/HubContext';
import { escuelaEnLinear } from '@/lib/actions/linear';
import { crearIssue } from '@/lib/actions/loops';
import type { EquipoIssue, Escuela, Loop } from '@/lib/types';

const EQUIPOS: EquipoIssue[] = ['CS', 'Tech', 'Product'];
const campo = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900';

interface Props {
  escuela: Escuela;
  loop?: Loop;
  equipoInicial?: EquipoIssue;
  onCerrar: () => void;
}

/** Nueva issue (suelta o como sub-issue de un loop). En las escuelas conectadas se crea en Linear. */
export function NuevaIssuePanel({ escuela, loop, equipoInicial = 'Tech', onCerrar }: Props) {
  const { ctx, ejecutar } = useHub();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [equipo, setEquipo] = useState<EquipoIssue>(equipoInicial);
  const [guardando, setGuardando] = useState(false);
  const enLinear = escuelaEnLinear(escuela);

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    if (titulo.trim() === '' || guardando) return;
    setGuardando(true);
    const ok = await ejecutar(
      () => crearIssue(ctx, escuela, { titulo: titulo.trim(), descripcion: descripcion.trim(), equipo, loopId: loop?.id ?? null }),
      'Issue creada',
    );
    setGuardando(false);
    if (ok) onCerrar();
  };

  return (
    <PanelLateral titulo={loop ? `Nueva sub-issue · ${loop.id}` : `Nueva issue · ${escuela.nombre}`} onCerrar={onCerrar}>
      <form onSubmit={crear} className="flex min-h-full flex-col gap-4">
        {loop && (
          <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Queda ligada al loop <span className="font-medium text-foreground">{loop.titulo}</span>.
          </p>
        )}
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Título
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={campo} autoFocus placeholder="Qué hay que hacer" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Equipo
          <select value={equipo} onChange={(e) => setEquipo(e.target.value as EquipoIssue)} className={campo}>
            {EQUIPOS.map((eq) => (
              <option key={eq} value={eq}>
                {eq}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Descripción
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={8}
            className={`${campo} resize-y`}
            placeholder="Contexto, pasos para reproducir, cuándo está terminada"
          />
        </label>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-200 pt-4">
          <p className="text-xs text-muted-foreground">
            {enLinear ? `Se crea en Linear, en el equipo ${equipo}.` : 'Escuela de ejemplo: queda solo en el hub.'}
          </p>
          <div className="flex gap-2">
            <Boton variante="fantasma" type="button" onClick={onCerrar}>
              Cancelar
            </Boton>
            <Boton variante="primario" type="submit" disabled={titulo.trim() === '' || guardando}>
              {guardando ? 'Creando…' : enLinear ? 'Crear en Linear' : 'Crear issue'}
            </Boton>
          </div>
        </div>
      </form>
    </PanelLateral>
  );
}
