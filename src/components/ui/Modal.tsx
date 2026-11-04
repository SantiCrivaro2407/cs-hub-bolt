import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({ titulo, onCerrar, children, ancho = 'max-w-lg' }: { titulo: string; onCerrar: () => void; children: ReactNode; ancho?: string }) {
  useEffect(() => {
    const cerrarConEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', cerrarConEsc);
    return () => window.removeEventListener('keydown', cerrarConEsc);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onMouseDown={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onMouseDown={(e) => e.stopPropagation()}
        className={`flex max-h-[90vh] w-full ${ancho} flex-col rounded-t-2xl bg-white shadow-xl animate-[toast-in_.18s_ease-out] sm:rounded-2xl`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
          <button onClick={onCerrar} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
