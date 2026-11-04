import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { navegar } from '@/lib/router';

export function Enlace({ href, onClick, ...resto }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const manejarClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navegar(href);
  };
  return <a {...resto} href={href} onClick={manejarClick} />;
}
