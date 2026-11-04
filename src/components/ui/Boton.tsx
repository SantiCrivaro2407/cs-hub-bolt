import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma';

// Mismas variantes que el Button de la plataforma (default / outline / destructive / ghost).
const CLASES: Record<Variante, string> = {
  primario: 'bg-primary text-primary-foreground shadow-tactile hover:bg-primary/90',
  secundario: 'border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
  peligro: 'bg-destructive text-destructive-foreground shadow-tactile hover:bg-destructive/90',
  fantasma: 'hover:bg-accent hover:text-accent-foreground',
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
      className={`inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 ${CLASES[variante]} ${className}`}
    >
      {children}
    </button>
  );
}
