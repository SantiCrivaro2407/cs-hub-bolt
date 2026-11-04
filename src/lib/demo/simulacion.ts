import { nuevoId, type NuevaInteraccion } from '@/lib/actions/base';
import type { Contacto, Escuela } from '@/lib/types';

interface PlantillaEmail {
  titulo: string;
  cuerpo: string;
}

interface PlantillaReunion {
  titulo: string;
  duracion: number;
  cuerpo: string;
  actionItems: string[];
}

interface PlantillaTicket {
  asunto: string;
  mensaje: string;
}

const EMAILS_ES: PlantillaEmail[] = [
  {
    titulo: 'Consulta sobre los reportes del período',
    cuerpo: 'Hola, quería consultar si los reportes de este período ya salen con las observaciones de la última semana. Gracias.',
  },
  {
    titulo: 'Docentes nuevos sin invitación',
    cuerpo: 'Buenos días. Dos docentes que se sumaron este mes no recibieron la invitación a la plataforma. ¿Pueden reenviarla?',
  },
  {
    titulo: 'Cambio de fecha de la capacitación',
    cuerpo: 'Necesitamos mover la capacitación del jueves para la semana que viene. ¿Qué horarios tienen disponibles?',
  },
];

const EMAILS_EN: PlantillaEmail[] = [
  {
    titulo: 'Question about this term reports',
    cuerpo: 'Hi, could you confirm whether this term reports already include last week observations? Thanks.',
  },
  {
    titulo: 'New teachers without an invitation',
    cuerpo: 'Good morning. Two teachers who joined this month have not received their invitation. Could you resend it?',
  },
  {
    titulo: 'Training date change',
    cuerpo: 'We need to move the training from Thursday to next week. Which slots are available?',
  },
];

const REUNIONES_ES: PlantillaReunion[] = [
  {
    titulo: 'Seguimiento de implementación',
    duracion: 25,
    cuerpo: 'Se revisó el uso de la última semana y el avance de las observaciones por docente. Quedaron próximos pasos con coordinación.',
    actionItems: ['Revisar invitaciones pendientes de docentes nuevos', 'Confirmar fecha de capacitación con coordinación'],
  },
  {
    titulo: 'Revisión de reportes con coordinación',
    duracion: 35,
    cuerpo: 'Repasamos cómo se leen los reportes de progreso y qué ajustes pide coordinación antes del cierre.',
    actionItems: ['Enviar guía corta de lectura de reportes'],
  },
];

const REUNIONES_EN: PlantillaReunion[] = [
  {
    titulo: 'Implementation follow-up',
    duracion: 25,
    cuerpo: 'We reviewed last week usage and observation progress by teacher. Next steps agreed with the coordination team.',
    actionItems: ['Review pending invitations for new teachers', 'Confirm training date with coordination'],
  },
  {
    titulo: 'Reports review with coordination',
    duracion: 35,
    cuerpo: 'We went through how progress reports are read and which adjustments coordination needs before term end.',
    actionItems: ['Send a short guide on reading the reports'],
  },
];

const TICKETS_ES: PlantillaTicket[] = [
  {
    asunto: 'No veo las observaciones de mi grupo',
    mensaje: 'Desde esta mañana no aparecen las observaciones de mi grupo en el panel. ¿Me pueden ayudar?',
  },
  {
    asunto: 'Error al exportar el reporte',
    mensaje: 'Al intentar descargar el reporte del período sale un error y no se genera el archivo.',
  },
];

const TICKETS_EN: PlantillaTicket[] = [
  {
    asunto: 'I cannot see my class observations',
    mensaje: 'Since this morning the observations for my class do not show up in the dashboard. Can you help?',
  },
  {
    asunto: 'Error when exporting the report',
    mensaje: 'When I try to download the term report an error appears and the file is not generated.',
  },
];

export function elegirAlAzar<T>(lista: T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

function plantillasDe<T>(escuela: Escuela, es: T[], en: T[]): T[] {
  return escuela.idioma === 'EN' ? en : es;
}

export function generarSincronizacionSimulada(escuela: Escuela, contactos: Contacto[]): NuevaInteraccion[] {
  if (contactos.length === 0) return [];
  const cantidad = Math.random() < 0.5 ? 1 : 2;
  const resultado: NuevaInteraccion[] = [];

  for (let i = 0; i < cantidad; i += 1) {
    const contacto = elegirAlAzar(contactos);
    if (Math.random() < 0.6) {
      const plantilla = elegirAlAzar(plantillasDe(escuela, EMAILS_ES, EMAILS_EN));
      resultado.push({
        escuela_id: escuela.id,
        tipo: 'email_recibido',
        titulo: plantilla.titulo,
        autor: contacto.nombre,
        cuerpo: plantilla.cuerpo,
      });
    } else {
      const plantilla = elegirAlAzar(plantillasDe(escuela, REUNIONES_ES, REUNIONES_EN));
      resultado.push({
        escuela_id: escuela.id,
        tipo: 'reunion',
        titulo: plantilla.titulo,
        autor: contacto.nombre,
        cuerpo: plantilla.cuerpo,
        duracion_min: plantilla.duracion,
        action_items: plantilla.actionItems.map((texto) => ({ id: nuevoId(), texto, loop_id: null })),
      });
    }
  }
  return resultado;
}

export function generarTicketSimulado(escuela: Escuela): PlantillaTicket {
  return elegirAlAzar(plantillasDe(escuela, TICKETS_ES, TICKETS_EN));
}
