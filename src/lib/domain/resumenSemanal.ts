import type { Escuela, HealthMetricas, HealthSnapshot, HubData } from '@/lib/types';
import { diasEntre, hacePlural } from '@/lib/domain/dates';
import { CATEGORIAS_HEALTH, ETIQUETA_NIVEL, nivelHealth, totalSnapshot, type CategoriaKey } from '@/lib/domain/health';
import { issueResuelta } from '@/lib/domain/loops';
import { pendientesEscuela, type Pendiente } from '@/lib/domain/pendientes';

const DIAS_SEMANA = 7;
// Cambios de menos de estos puntos en un estándar se cuentan como "estable".
const UMBRAL_CAMBIO = 3;

export interface ResumenSemanal {
  health: string;
  actividad: string;
  pendientes: Pendiente[];
}

function cant(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

function enumerar(partes: string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`;
}

const DETALLE: Record<CategoriaKey, (m: HealthMetricas) => string> = {
  activacion: (m) =>
    `quedan ${cant(m.activacion.invitaciones_vencidas, 'invitación vencida', 'invitaciones vencidas')} y ${cant(m.activacion.bloqueos_setup, 'bloqueo', 'bloqueos')} de setup`,
  engagement: (m) =>
    `${m.engagement.docentes_activos} de ${m.engagement.docentes_total} docentes activos y el uso semanal pasó de ${m.engagement.uso_semana_anterior_pct} % a ${m.engagement.uso_semana_pct} %`,
  calidad: (m) => `la calidad promedio de las observaciones está en ${m.calidad.calidad_promedio}`,
  cobertura: (m) => `se observó a ${m.cobertura.alumnos_observados_15d} de ${m.cobertura.alumnos_total} alumnos en los últimos 15 días`,
};

function snapshotSemanaAnterior(historia: HealthSnapshot[], actual: HealthSnapshot): HealthSnapshot | null {
  const objetivo = new Date(actual.fecha);
  objetivo.setDate(objetivo.getDate() - DIAS_SEMANA);
  const candidatos = historia.filter((s) => s !== actual && s.fecha < actual.fecha);
  return candidatos.reduce<HealthSnapshot | null>(
    (mejor, s) => (!mejor || Math.abs(diasEntre(s.fecha, objetivo)) < Math.abs(diasEntre(mejor.fecha, objetivo)) ? s : mejor),
    null,
  );
}

function parrafoHealth(snapshots: HealthSnapshot[]): string {
  const historia = [...snapshots].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const actual = historia.at(-1);
  if (!actual) return 'Todavía no hay datos de health para esta escuela.';

  const total = totalSnapshot(actual);
  const anterior = snapshotSemanaAnterior(historia, actual);
  const frases: string[] = [];

  let apertura = `El health cerró la semana en ${total} (${ETIQUETA_NIVEL[nivelHealth(total)].toLowerCase()})`;
  if (anterior) {
    const delta = total - totalSnapshot(anterior);
    apertura +=
      delta === 0
        ? ', igual que la semana pasada'
        : `, ${cant(Math.abs(delta), 'punto', 'puntos')} ${delta > 0 ? 'más' : 'menos'} que la semana pasada`;
  }
  frases.push(`${apertura}.`);

  if (anterior) {
    const cambios = CATEGORIAS_HEALTH.map((c) => ({ ...c, delta: actual[c.key] - anterior[c.key] })).sort((a, b) => a.delta - b.delta);
    const peor = cambios[0];
    const mejor = cambios.at(-1)!;
    if (peor.delta <= -UMBRAL_CAMBIO) frases.push(`Lo que más bajó fue ${peor.label} (−${Math.abs(peor.delta)}): ${DETALLE[peor.key](actual.metricas)}.`);
    if (mejor.delta >= UMBRAL_CAMBIO) frases.push(`${mejor.label} subió ${cant(mejor.delta, 'punto', 'puntos')}.`);
    if (peor.delta > -UMBRAL_CAMBIO && mejor.delta < UMBRAL_CAMBIO) frases.push('Los cuatro estándares se mantuvieron estables.');
  }

  const masFlojo = [...CATEGORIAS_HEALTH].sort((a, b) => actual[a.key] - actual[b.key])[0];
  if (actual[masFlojo.key] < 50) {
    frases.push(`El estándar más flojo es ${masFlojo.label} (${actual[masFlojo.key]}): ${DETALLE[masFlojo.key](actual.metricas)}.`);
  }
  return frases.join(' ');
}

function parrafoActividad(datos: HubData, escuela: Escuela, ahora: Date): string {
  const enLaSemana = (fecha: string | null) => fecha !== null && diasEntre(fecha, ahora) < DIAS_SEMANA;
  const frases: string[] = [];

  const interacciones = datos.interacciones.filter((i) => i.escuela_id === escuela.id && enLaSemana(i.fecha));
  const recibidos = interacciones.filter((i) => i.tipo === 'email_recibido').length;
  const enviados = interacciones.filter((i) => i.tipo === 'email_enviado').length;
  const reuniones = interacciones.filter((i) => i.tipo === 'reunion');
  const contacto: string[] = [];
  if (recibidos > 0 && enviados > 0) {
    contacto.push(`${cant(recibidos + enviados, 'email', 'emails')} (${recibidos} ${recibidos === 1 ? 'recibido' : 'recibidos'} y ${enviados} ${enviados === 1 ? 'enviado' : 'enviados'})`);
  } else if (recibidos > 0) {
    contacto.push(cant(recibidos, 'email recibido', 'emails recibidos'));
  } else if (enviados > 0) {
    contacto.push(cant(enviados, 'email enviado', 'emails enviados'));
  }
  if (reuniones.length > 0) contacto.push(`${cant(reuniones.length, 'reunión', 'reuniones')} (${reuniones.map((r) => `«${r.titulo}»`).join(', ')})`);
  if (contacto.length > 0) {
    frases.push(`En los últimos 7 días hubo ${enumerar(contacto)}.`);
  } else {
    const ultimo = escuela.ultimo_contacto ? `; el último contacto fue ${hacePlural(diasEntre(escuela.ultimo_contacto, ahora))}` : '';
    frases.push(`En los últimos 7 días no hubo emails ni reuniones con la escuela${ultimo}.`);
  }

  const tickets = datos.tickets.filter((t) => t.escuela_id === escuela.id);
  const ticketsNuevos = tickets.filter((t) => enLaSemana(t.creado)).length;
  const ticketsResueltos = tickets.filter((t) => t.estado === 'Resuelto' && enLaSemana(t.actualizado)).length;
  const sinResponder = tickets.filter((t) => t.estado === 'Nuevo').length;
  const fraseTickets = [
    ticketsNuevos > 0 ? `${ticketsNuevos === 1 ? 'Entró' : 'Entraron'} ${cant(ticketsNuevos, 'ticket nuevo', 'tickets nuevos')}` : 'No entraron tickets nuevos',
    ticketsResueltos > 0 ? `se ${ticketsResueltos === 1 ? 'resolvió' : 'resolvieron'} ${ticketsResueltos}` : null,
    sinResponder > 0 ? `${cant(sinResponder, 'sigue', 'siguen')} sin responder` : null,
  ].filter(Boolean);
  frases.push(`${enumerar(fraseTickets as string[])}.`);

  const loops = datos.loops.filter((l) => l.escuela_id === escuela.id);
  const loopsNuevos = loops.filter((l) => enLaSemana(l.creado)).length;
  const loopsCerrados = loops.filter((l) => enLaSemana(l.cerrado)).length;
  const loopsAbiertos = loops.filter((l) => l.estado !== 'Closed').length;
  const listos = loops.filter((l) => l.estado === 'Ready to reply').length;
  if (loops.length > 0) {
    const movimiento = [
      loopsNuevos > 0 ? `se ${loopsNuevos === 1 ? 'abrió' : 'abrieron'} ${cant(loopsNuevos, 'loop', 'loops')}` : null,
      loopsCerrados > 0 ? `se ${loopsCerrados === 1 ? 'cerró' : 'cerraron'} ${loopsCerrados}` : null,
    ].filter(Boolean) as string[];
    const estado = `${loopsAbiertos === 1 ? 'queda' : 'quedan'} ${cant(loopsAbiertos, 'loop abierto', 'loops abiertos')}${listos > 0 ? `, ${listos} ${listos === 1 ? 'listo' : 'listos'} para responder` : ''}`;
    const texto = movimiento.length > 0 ? `En loops ${enumerar(movimiento)}; ${estado}.` : `En loops no hubo movimiento: ${estado}.`;
    frases.push(texto);
  }

  const issuesMovidas = datos.issues.filter((i) => i.escuela_id === escuela.id && enLaSemana(i.actualizada));
  if (issuesMovidas.length > 0) {
    const resueltas = issuesMovidas.filter(issueResuelta).length;
    const enCurso = issuesMovidas.length - resueltas;
    const detalle = [resueltas > 0 ? `${resueltas} ${resueltas === 1 ? 'resuelta' : 'resueltas'}` : null, enCurso > 0 ? `${enCurso} en curso` : null].filter(Boolean) as string[];
    frases.push(`En Linear se ${issuesMovidas.length === 1 ? 'movió' : 'movieron'} ${cant(issuesMovidas.length, 'issue', 'issues')}: ${enumerar(detalle)}.`);
  }

  return frases.join(' ');
}

/** Resumen en lenguaje natural de la última semana de la escuela, armado con los datos del hub. */
export function resumenSemanal(datos: HubData, escuela: Escuela, ahora = new Date()): ResumenSemanal {
  return {
    health: parrafoHealth(datos.snapshots.filter((s) => s.escuela_id === escuela.id)),
    actividad: parrafoActividad(datos, escuela, ahora),
    pendientes: pendientesEscuela(datos, escuela, ahora),
  };
}
