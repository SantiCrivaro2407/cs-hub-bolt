import { LayoutGrid, List } from 'lucide-react';
import { navegar, urlConParams, useRuta } from '@/lib/router';

export type VistaHealth = 'lista' | 'canvas';

/** La vista elegida vive en la URL (?vista=canvas) para que sobreviva a recargas y links. */
export function useVistaHealth(): [VistaHealth, (vista: VistaHealth) => void] {
  const { path, params } = useRuta();
  const vista: VistaHealth = params.get('vista') === 'canvas' ? 'canvas' : 'lista';
  const cambiar = (nueva: VistaHealth) => navegar(urlConParams(path, { vista: nueva === 'lista' ? null : nueva }, params), { reemplazar: true });
  return [vista, cambiar];
}

const OPCIONES = [
  { valor: 'lista', etiqueta: 'Lista', Icono: List },
  { valor: 'canvas', etiqueta: 'Canvas', Icono: LayoutGrid },
] as const;

export function SelectorVista({ vista, onCambiar }: { vista: VistaHealth; onCambiar: (vista: VistaHealth) => void }) {
  return (
    <div role="tablist" aria-label="Vista" className="inline-flex rounded-lg border border-border bg-muted p-0.5">
      {OPCIONES.map(({ valor, etiqueta, Icono }) => (
        <button
          key={valor}
          role="tab"
          aria-selected={vista === valor}
          onClick={() => onCambiar(valor)}
          className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm ${
            vista === valor ? 'bg-card font-medium text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icono className="h-4 w-4" />
          {etiqueta}
        </button>
      ))}
    </div>
  );
}
