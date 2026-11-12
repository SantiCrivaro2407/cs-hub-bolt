import type { EstadoIssue, Escuela, HubData } from '@/lib/types';
import { rutaEscuela } from '@/lib/domain/cartera';
import { diasEntre, hacePlural } from '@/lib/domain/dates';
import { agruparEnHilos, asuntoDelHilo } from '@/lib/domain/hilos';
import { contarResueltas, issueResuelta, loopVencido, ORDEN_ESTADO_LOOP, ticketVencido } from '@/lib/domain/loops';

// Un mail que la escuela mandó y nadie contestó deja de pedir atención después de este tiempo.
const DIAS_MAIL_SIN_RESPUESTA = 30;
// Un mail sin respuesta hace más de esto se marca como vencido.
const DIAS_MAIL_VENCIDO = 2;
// Una issue de CS sin movimiento hace más de esto se marca como vencida.
const DIAS_ISSUE_QUIETA = 7;

const ORDEN_ESTADO: Partial<Record<EstadoIssue, number>> = { 'In Progress': 0, 'In Review': 1, Todo: 2, Backlog: 3 };

export type TipoPendiente = 'ticket' | 'mail' | 'loop' | 'issue';

export interface Pendiente {
  id: string;
  tipo: TipoPendiente;
  /** Una línea, para el globito de la tarjeta. */
  texto: string;
  /** Qué hay que hacer o responder, corto. */
  titulo: string;
  /** Contexto: quién, desde cuándo, en qué estado. */
  detalle: string;
  href: string;
  urgente: boolean;
  /** Para issues: identificador y estado en Linear. */
  issue?: { id: string; estado: EstadoIssue };
  /** Para loops: sub-issues abiertas, cada una con su link. */
  subIssues?: { id: string; titulo: string; estado: EstadoIssue; href: string }[];
  /** Loop con todas sus issues resueltas: falta responderle a la escuela. */
  listo?: boolean;
}

// Respuestas automáticas (calendario, fuera de oficina, notificaciones): no esperan respuesta.
const ASUNTO_AUTOMATICO =
  /^\s*(aceptada|aceptado|accepted|rechazada|rechazado|declined|tentativa|tentative|invitaci[oó]n|invitation|updated invitation|invitaci[oó]n actualizada|nuevo evento|new event|respuesta autom[aá]tica|automatic reply|auto[- ]?reply|out of office|fuera de la oficina)\b/i;
const REMITENTE_AUTOMATICO = /(no-?reply|notifications?|calendar-notification|mailer-daemon)@/i;
// Avisos de documentos compartidos (Google Drive y similares).
const ASUNTO_COMPARTIDO = /\b(ha compartido|compartió|has shared|shared .+ with you|te invitó a editar|invited you to edit)\b/i;
// La bandeja de soporte del equipo (HubSpot) manda en nombre del equipo.
const DOMINIOS_EQUIPO_EXTRA = ['hubspot-inbox.com'];

const emailDe = (de: string | null | undefined) => de?.match(/[^\s<>"]+@[^\s<>"]+/)?.[0]?.toLowerCase() ?? null;

const sinPrefijoEscuela = (titulo: string) => titulo.replace(/^\s*\[[^\]]*\]\s*[-–:]?\s*/, '').trim() || titulo;

/**
 * Lo que el equipo tiene que hacer con esta escuela: responder lo que quedó sin respuesta
 * (tickets, mails, loops ya resueltos) y las issues de CS abiertas.
 * Es la misma lista para el globito de la tarjeta y para los pendientes del resumen semanal.
 */
export function pendientesEscuela(datos: HubData, escuela: Escuela, ahora = new Date()): Pendiente[] {
  const pendientes: Pendiente[] = [];
  const contacto = (id: string | null) => datos.contactos.find((c) => c.id === id)?.nombre;

  // Tickets que nadie respondió todavía.
  for (const t of datos.tickets.filter((t) => t.escuela_id === escuela.id && t.estado === 'Nuevo')) {
    const quien = contacto(t.contacto_id);
    const hace = hacePlural(diasEntre(t.creado, ahora));
    pendientes.push({
      id: `ticket:${t.id}`,
      tipo: 'ticket',
      texto: `Responder el ticket «${t.asunto}»${quien ? ` de ${quien}` : ''}`,
      titulo: t.asunto,
      detalle: `${quien ?? 'Sin contacto'} · abierto ${hace}, sin respuesta`,
      href: rutaEscuela(escuela, 'tickets', { ticket: t.id }),
      urgente: ticketVencido(t, ahora),
    });
  }

  // Mails: conversaciones cuyo último mensaje lo escribió la escuela (si contestó alguien del equipo, ya está).
  // Los de tickets ya están arriba; las respuestas automáticas no cuentan.
  const dominiosEquipo = [...new Set(datos.equipo.map((m) => m.email.split('@')[1]?.toLowerCase()).filter(Boolean)), ...DOMINIOS_EQUIPO_EXTRA];
  const escribioLaEscuela = (de: string | null | undefined) => {
    const email = emailDe(de);
    if (!email || REMITENTE_AUTOMATICO.test(email)) return false;
    const dominio = email.split('@')[1];
    return !dominiosEquipo.some((d) => dominio === d || dominio.endsWith(`.${d}`));
  };
  const interacciones = datos.interacciones.filter(
    (i) => i.escuela_id === escuela.id && !ASUNTO_AUTOMATICO.test(i.titulo) && !ASUNTO_COMPARTIDO.test(i.titulo),
  );
  for (const hilo of agruparEnHilos(interacciones)) {
    const ultimo = hilo.ultimo;
    if (ultimo.tipo !== 'email_recibido' || !escribioLaEscuela(ultimo.de) || hilo.mensajes.some((m) => m.ticket_id)) continue;
    const dias = diasEntre(ultimo.fecha, ahora);
    if (dias > DIAS_MAIL_SIN_RESPUESTA) continue;
    pendientes.push({
      id: `mail:${ultimo.id}`,
      tipo: 'mail',
      texto: `Responder el mail «${asuntoDelHilo(hilo)}» de ${ultimo.autor}`,
      titulo: asuntoDelHilo(hilo),
      detalle: `${ultimo.autor} · recibido ${hacePlural(dias)}${hilo.mensajes.length > 1 ? ` · ${hilo.mensajes.length} mensajes` : ''}`,
      href: rutaEscuela(escuela, 'interacciones', { interaccion: ultimo.id }),
      urgente: dias > DIAS_MAIL_VENCIDO,
    });
  }

  // Loops abiertos: primero los que ya se pueden responder, después los vencidos y el resto.
  const loops = datos.loops
    .filter((l) => l.escuela_id === escuela.id && l.estado !== 'Closed')
    .sort((a, b) => ORDEN_ESTADO_LOOP[a.estado] - ORDEN_ESTADO_LOOP[b.estado] || a.creado.localeCompare(b.creado));
  for (const l of loops) {
    const quien = contacto(l.quien_espera);
    const ligadas = datos.issues.filter((i) => i.loop_id === l.id);
    const abiertas = ligadas.filter((i) => !issueResuelta(i));
    const listo = l.estado === 'Ready to reply';
    const progreso = ligadas.length ? `${contarResueltas(ligadas)}/${ligadas.length} issues resueltas` : 'sin issues todavía';
    pendientes.push({
      id: `loop:${l.id}`,
      tipo: 'loop',
      texto: listo ? `Responder${quien ? ` a ${quien}` : ''}: «${l.titulo}» ya está resuelto` : `Loop abierto: «${l.titulo}»`,
      titulo: l.titulo,
      detalle: [listo ? 'Listo para responder' : progreso, quien ? `espera ${quien}` : null, `abierto ${hacePlural(diasEntre(l.creado, ahora))}`]
        .filter(Boolean)
        .join(' · '),
      href: rutaEscuela(escuela, 'loops', { loop: l.id }),
      urgente: !listo && loopVencido(l, ahora),
      listo,
      subIssues: abiertas.map((i) => ({
        id: i.id,
        titulo: sinPrefijoEscuela(i.titulo),
        estado: i.estado,
        href: rutaEscuela(escuela, 'issues', { issue: i.id }),
      })),
    });
  }

  // Issues de CS abiertas que no son parte de un loop (las de los loops van dentro de su loop). Primero las en curso.
  const issues = datos.issues
    .filter((i) => i.escuela_id === escuela.id && i.equipo === 'CS' && !i.loop_id && !issueResuelta(i))
    .sort((a, b) => (ORDEN_ESTADO[a.estado] ?? 9) - (ORDEN_ESTADO[b.estado] ?? 9) || b.actualizada.localeCompare(a.actualizada));
  for (const i of issues) {
    const quieta = diasEntre(i.actualizada, ahora);
    pendientes.push({
      id: `issue:${i.id}`,
      tipo: 'issue',
      texto: `${i.id}: ${sinPrefijoEscuela(i.titulo)}`,
      titulo: sinPrefijoEscuela(i.titulo),
      detalle: [
        i.asignado,
        quieta > DIAS_ISSUE_QUIETA ? `sin movimiento hace ${quieta} días` : `actualizada ${hacePlural(quieta)}`,
      ]
        .filter(Boolean)
        .join(' · '),
      href: rutaEscuela(escuela, 'issues', { issue: i.id }),
      urgente: quieta > DIAS_ISSUE_QUIETA,
      issue: { id: i.id, estado: i.estado },
    });
  }

  return pendientes;
}
