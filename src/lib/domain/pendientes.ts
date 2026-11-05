import type { Escuela, HubData } from '@/lib/types';
import { rutaEscuela } from '@/lib/domain/cartera';
import { diasEntre, diasHabilesEntre, hacePlural } from '@/lib/domain/dates';
import { resumenHealth } from '@/lib/domain/health';
import { loopVencido, ticketVencido } from '@/lib/domain/loops';

// Cuánto tiempo sigue pidiendo atención un action item de reunión que nadie convirtió en loop.
const DIAS_ACTION_ITEM = 14;

export interface Pendiente {
  id: string;
  texto: string;
  href: string;
  urgente: boolean;
}

/**
 * Lo que necesita que alguien del equipo haga algo con esta escuela.
 * Es la misma lista para el globito de la tarjeta y para los bullets del resumen semanal.
 */
export function pendientesEscuela(datos: HubData, escuela: Escuela, ahora = new Date()): Pendiente[] {
  const pendientes: Pendiente[] = [];
  const contacto = (id: string | null) => datos.contactos.find((c) => c.id === id)?.nombre;

  for (const t of datos.tickets.filter((t) => t.escuela_id === escuela.id && t.estado === 'Nuevo')) {
    const quien = contacto(t.contacto_id);
    pendientes.push({
      id: `ticket:${t.id}`,
      texto: `Responder el ticket «${t.asunto}»${quien ? ` de ${quien}` : ''} (${hacePlural(diasEntre(t.creado, ahora))})`,
      href: rutaEscuela(escuela, 'tickets', { ticket: t.id }),
      urgente: ticketVencido(t, ahora),
    });
  }

  for (const l of datos.loops.filter((l) => l.escuela_id === escuela.id)) {
    if (l.estado === 'Ready to reply') {
      const quien = contacto(l.quien_espera);
      pendientes.push({
        id: `loop:${l.id}`,
        texto: `Responder${quien ? ` a ${quien}` : ''}: las issues de «${l.titulo}» ya están resueltas`,
        href: rutaEscuela(escuela, 'loops', { loop: l.id }),
        urgente: false,
      });
    } else if (loopVencido(l, ahora)) {
      pendientes.push({
        id: `loop:${l.id}`,
        texto: `Destrabar el loop «${l.titulo}»: lleva ${diasHabilesEntre(l.creado, ahora)} días hábiles abierto`,
        href: rutaEscuela(escuela, 'loops', { loop: l.id }),
        urgente: true,
      });
    }
  }

  const reuniones = datos.interacciones.filter(
    (i) => i.escuela_id === escuela.id && i.tipo === 'reunion' && diasEntre(i.fecha, ahora) <= DIAS_ACTION_ITEM,
  );
  for (const r of reuniones) {
    for (const item of r.action_items.filter((a) => !a.loop_id)) {
      pendientes.push({
        id: `action:${item.id}`,
        texto: `Action item de «${r.titulo}»: ${item.texto}`,
        href: rutaEscuela(escuela, 'interacciones'),
        urgente: false,
      });
    }
  }

  const health = resumenHealth(datos.snapshots.filter((s) => s.escuela_id === escuela.id));
  if (health.caida && health.delta !== null) {
    pendientes.push({
      id: 'health',
      texto: `Revisar la caída del health: −${Math.abs(health.delta)} puntos en 15 días`,
      href: rutaEscuela(escuela, 'health'),
      urgente: true,
    });
  }

  return pendientes.sort((a, b) => Number(b.urgente) - Number(a.urgente));
}
