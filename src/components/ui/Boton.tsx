import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma';

const CLASES: Record<Variante, string> = {
  primario: 'bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-300',
  secundario: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:text-slate-400',
  peligro: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300',
  fantasma: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
};

export function Boton({
  variante = 'secundario',
  children,
  className = '',
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; children: ReactNode }) {
  return (
    <button
      {...resto}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${CLASES[variante]} ${className}`}
    >
      {children}
    </button>
  );
}
