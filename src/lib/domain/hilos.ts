import type { Interaccion } from '@/lib/types';

export interface Hilo {
  clave: string;
  /** Del más viejo al más nuevo. */
  mensajes: Interaccion[];
  ultimo: Interaccion;
}

/**
 * Agrupa las interacciones en conversaciones. Dos mensajes van juntos si comparten hilo de Gmail,
 * el mismo ticket, o si uno responde al otro (`hilo = id:<original>`). Se unen todas las claves
 * transitivamente: la respuesta a un ticket que después siguió por Gmail queda en un solo hilo.
 */
export function agruparEnHilos(interacciones: Interaccion[]): Hilo[] {
  const padre = new Map<string, string>();
  const raiz = (x: string): string => {
    let r = x;
    while (padre.get(r) !== r) r = padre.get(r) ?? r;
    padre.set(x, r);
    return r;
  };
  const unir = (a: string, b: string) => {
    if (!padre.has(a)) padre.set(a, a);
    if (!padre.has(b)) padre.set(b, b);
    const ra = raiz(a);
    const rb = raiz(b);
    if (ra !== rb) padre.set(ra, rb);
  };

  for (const i of interacciones) {
    const propia = `id:${i.id}`;
    unir(propia, propia);
    if (i.hilo) unir(propia, i.hilo);
    if (i.ticket_id) unir(propia, `ticket:${i.ticket_id}`);
  }

  const grupos = new Map<string, Interaccion[]>();
  for (const i of interacciones) {
    const r = raiz(`id:${i.id}`);
    grupos.set(r, [...(grupos.get(r) ?? []), i]);
  }

  return [...grupos.entries()]
    .map(([clave, mensajes]) => {
      const ordenados = [...mensajes].sort((a, b) => a.fecha.localeCompare(b.fecha));
      return { clave, mensajes: ordenados, ultimo: ordenados[ordenados.length - 1] };
    })
    .sort((a, b) => b.ultimo.fecha.localeCompare(a.ultimo.fecha));
}

/** Asunto de la conversación, sin los "Re:" / "Fwd:" acumulados. */
export function asuntoDelHilo(hilo: Hilo): string {
  const primero = hilo.mensajes[0];
  return primero.titulo.replace(/^\s*((re|rv|fw|fwd|res)\s*:\s*)+/i, '').trim() || primero.titulo;
}
