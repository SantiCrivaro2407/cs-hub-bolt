import { useSyncExternalStore } from 'react';

const EVENTO_NAVEGACION = 'cshub:navegacion';

function suscribir(callback: () => void): () => void {
  window.addEventListener('popstate', callback);
  window.addEventListener(EVENTO_NAVEGACION, callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener(EVENTO_NAVEGACION, callback);
  };
}

function urlActual(): string {
  return window.location.pathname + window.location.search;
}

export function navegar(url: string, opciones: { reemplazar?: boolean } = {}): void {
  if (opciones.reemplazar) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
  window.dispatchEvent(new Event(EVENTO_NAVEGACION));
}

export interface Ruta {
  path: string;
  params: URLSearchParams;
}

export function useRuta(): Ruta {
  const url = useSyncExternalStore(suscribir, urlActual);
  const indice = url.indexOf('?');
  return {
    path: indice === -1 ? url : url.slice(0, indice),
    params: new URLSearchParams(indice === -1 ? '' : url.slice(indice + 1)),
  };
}

export function urlConParams(path: string, cambios: Record<string, string | null>, actuales: URLSearchParams): string {
  const params = new URLSearchParams(actuales);
  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === null || valor === '') params.delete(clave);
    else params.set(clave, valor);
  }
  const texto = params.toString();
  return texto ? `${path}?${texto}` : path;
}
