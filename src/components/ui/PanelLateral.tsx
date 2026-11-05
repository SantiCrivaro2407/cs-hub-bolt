import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * Panel que entra desde la derecha. Deja ver lo que hay atrás (el ticket, el loop, el email)
 * mientras se escribe la respuesta.
 */
export function PanelLateral({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    const cerrarConEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', cerrarConEsc);
    return () => window.removeEventListener('keydown', cerrarConEsc);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-foreground/10" onMouseDown={onCerrar}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-xl animate-[panel-in_.2s_ease-out]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="truncate text-base font-semibold">{titulo}</h2>
          <button onClick={onCerrar} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </div>
  );
}
