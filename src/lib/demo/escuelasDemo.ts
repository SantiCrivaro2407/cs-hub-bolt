import type { Etapa, EstadoTicket, Idioma, RolContacto, TipoInteraccion } from '@/lib/types';

export interface ContactoDemo {
  local: string;
  nombre: string;
  cargo: string;
  rol: RolContacto;
}

export interface ActionItemDemo {
  texto: string;
  loopId?: string;
}

export interface InteraccionDemo {
  tipo: TipoInteraccion;
  titulo: string;
  autor: string;
  hace: number;
  cuerpo: string;
  duracion?: number;
  actionItems?: ActionItemDemo[];
  origenDeLoop?: string;
}

export interface RespuestaDemo {
  autor: string;
  cuerpo: string;
  hace: number;
}

export interface TicketDemo {
  contacto: string;
  asunto: string;
  mensaje: string;
  estado: EstadoTicket;
  hace: number;
  respuestas?: RespuestaDemo[];
  origenDeLoop?: string;
}

export interface EscuelaDemo {
  nombre: string;
  slug: string;
  codigo: string;
  iniciales: string;
  idioma: Idioma;
  grupoPagador?: string;
  sedes?: string;
  etapa: Etapa;
  owner: string;
  dominio: string;
  docentes: number;
  health: { actual: number; hace15: number };
  ultimoContactoHace: number;
  vacios: string[];
  contactos: ContactoDemo[];
  interacciones: InteraccionDemo[];
  tickets: TicketDemo[];
}

export const ESCUELAS_DEMO: EscuelaDemo[] = [
  {
    nombre: 'Colegio Aleph',
    slug: 'aleph',
    codigo: 'ALE',
    iniciales: 'AL',
    idioma: 'ES',
    grupoPagador: 'Transforma',
    etapa: 'Piloto',
    owner: 'Ignacio',
    dominio: 'aleph.example',
    docentes: 22,
    health: { actual: 20, hace15: 38 },
    ultimoContactoHace: 9,
    vacios: ['Feriados cargados', 'Fecha de go-live', 'Grados o cursos incluidos'],
    contactos: [
      { local: 'daniela.ortiz', nombre: 'Daniela Ortiz', cargo: 'Directora general', rol: 'decisor' },
      { local: 'sofia.trevino', nombre: 'Sofía Treviño', cargo: 'Coordinadora de primaria', rol: 'champion' },
      { local: 'tomas.ruiz', nombre: 'Tomás Ruiz', cargo: 'Administrador de plataforma', rol: 'admin' },
      { local: 'lucia.medina', nombre: 'Lucía Medina', cargo: 'Docente de 4° grado', rol: 'docente' },
    ],
    interacciones: [
      {
        tipo: 'reunion',
        titulo: 'Revisión del calendario académico',
        autor: 'Daniela Ortiz',
        hace: 13,
        duracion: 40,
        cuerpo:
          'Repasamos las fechas que necesitamos para cargar el calendario y los períodos de reporte. Quedó pendiente definir el formato.',
        actionItems: [{ texto: 'Definir el formato de fechas del calendario' }],
      },
      {
        tipo: 'email_enviado',
        titulo: 'Re: Accesos para docentes nuevos',
        autor: 'Ignacio',
        hace: 7,
        cuerpo: 'Hola Tomás, te paso el procedimiento para dar de alta a los docentes nuevos desde el panel de administración.',
      },
      {
        tipo: 'nota',
        titulo: 'Llamada con dirección',
        autor: 'Ignacio',
        hace: 5,
        cuerpo: 'Daniela pide priorizar la carga de docentes de primaria antes del 15.',
      },
      {
        tipo: 'registro_interno',
        titulo: 'Etapa cambiada a Piloto',
        autor: 'Ignacio',
        hace: 30,
        cuerpo: '',
      },
    ],
    tickets: [
      {
        contacto: 'sofia.trevino',
        asunto: 'Exportar observaciones a Excel',
        mensaje: 'Hola, ¿hay forma de bajar las observaciones de mi grupo a una planilla? Lo necesito para el informe trimestral.',
        estado: 'En curso',
        hace: 6,
        respuestas: [
          {
            autor: 'Ignacio',
            cuerpo: 'Hola Sofía, lo estamos revisando con el equipo. Te aviso en cuanto tengamos definido el formato.',
            hace: 5,
          },
        ],
        origenDeLoop: 'L-ALE-01',
      },
      {
        contacto: 'lucia.medina',
        asunto: 'No aparecen los docentes nuevos',
        mensaje: 'Me invitaron pero no me llega el acceso a mi cuenta de docente de 4° grado.',
        estado: 'Nuevo',
        hace: 3,
      },
      {
        contacto: 'tomas.ruiz',
        asunto: 'Certificado de la instancia',
        mensaje: 'Necesitamos el certificado de la instancia para la auditoría interna.',
        estado: 'Resuelto',
        hace: 12,
        respuestas: [
          { autor: 'Ignacio', cuerpo: 'Listo, te lo envié por email a la dirección de administración.', hace: 10 },
        ],
      },
    ],
  },
  {
    nombre: 'Colina (CLC)',
    slug: 'clc',
    codigo: 'COL',
    iniciales: 'CL',
    idioma: 'EN',
    etapa: 'Live',
    owner: 'Marco',
    dominio: 'colina.example',
    docentes: 38,
    health: { actual: 44, hace15: 41 },
    ultimoContactoHace: 2,
    vacios: ['Presupuesto aprobado'],
    contactos: [
      { local: 'ben.carter', nombre: 'Ben Carter', cargo: 'Director académico', rol: 'decisor' },
      { local: 'emese.varga', nombre: 'Emese Varga', cargo: 'Coordinadora de Experiencias', rol: 'champion' },
      { local: 'hannah.price', nombre: 'Hannah Price', cargo: 'Coordinadora de Year 4', rol: 'liaison' },
    ],
    interacciones: [
      {
        tipo: 'email_recibido',
        titulo: 'Orden de materias en los reportes',
        autor: 'Ben Carter',
        hace: 16,
        cuerpo:
          'Hi team, subjects appear in alphabetical order in the reports rather than in the school timetable order. Could we change that before the parent evening?',
        origenDeLoop: 'L-COL-02',
      },
      {
        tipo: 'reunion',
        titulo: 'Feedback de Experiencias (llamada del 7/10)',
        autor: 'Emese Varga',
        hace: 10,
        duracion: 55,
        cuerpo:
          'Emese quiere ver los estándares ligados dentro de cada observación de Experiencias. Lo prioriza para el trimestre.',
        actionItems: [{ texto: 'Mostrar estándares dentro de cada observación de Experiencias' }],
        origenDeLoop: 'L-COL-01',
      },
      {
        tipo: 'email_enviado',
        titulo: 'Re: Orden de materias en los reportes',
        autor: 'Marco',
        hace: 14,
        cuerpo: 'Thanks Ben, we are checking the report order and will come back to you this week.',
      },
      {
        tipo: 'reunion',
        titulo: 'Revisión mensual de adopción',
        autor: 'Ben Carter',
        hace: 25,
        duracion: 30,
        cuerpo: 'El uso de observaciones por docente subió. Preocupa el nivel de adopción en Year 2.',
        actionItems: [{ texto: 'Enviar resumen de adopción por docente' }],
      },
      {
        tipo: 'nota',
        titulo: 'Hannah pide apoyo para Year 4',
        autor: 'Marco',
        hace: 2,
        cuerpo: 'Quiere una sesión corta con su equipo de Year 4 antes de fin de mes.',
      },
      {
        tipo: 'registro_interno',
        titulo: 'Etapa cambiada a Live',
        autor: 'Marco',
        hace: 40,
        cuerpo: '',
      },
    ],
    tickets: [
      {
        contacto: 'hannah.price',
        asunto: 'Ver observaciones de otro docente',
        mensaje: 'Una docente no puede ver las observaciones de su compañera de Year 4.',
        estado: 'Resuelto',
        hace: 5,
        respuestas: [
          {
            autor: 'Marco',
            cuerpo: 'Corregido: se habilitó el acceso por grupo. ¿Podés confirmar que ya lo ven?',
            hace: 4,
          },
        ],
      },
    ],
  },
  {
    nombre: 'British Zona Sul',
    slug: 'bsrjzs',
    codigo: 'BZS',
    iniciales: 'BZ',
    idioma: 'EN',
    grupoPagador: 'British',
    sedes: 'Urca y Botafogo',
    etapa: 'Onboarding',
    owner: 'Santiago',
    dominio: 'britishzs.example',
    docentes: 26,
    health: { actual: 34, hace15: 37 },
    ultimoContactoHace: 1,
    vacios: ['Integraciones activas'],
    contactos: [
      { local: 'richard.shaw', nombre: 'Richard Shaw', cargo: 'Head of School', rol: 'decisor' },
      { local: 'patricia.ramos', nombre: 'Patrícia Ramos', cargo: 'Coordinadora Urca', rol: 'liaison' },
      { local: 'will.harper', nombre: 'Will Harper', cargo: 'Admin Botafogo', rol: 'admin' },
      { local: 'olivia.brown', nombre: 'Olivia Brown', cargo: 'Docente de Year 7', rol: 'docente' },
    ],
    interacciones: [
      {
        tipo: 'email_recibido',
        titulo: 'Acceso admin Botafogo y archivos DNA',
        autor: 'Will Harper',
        hace: 19,
        cuerpo:
          'Hi, could we arrange an admin call for Botafogo? Also, can you review the DNA files before we invite the rest of the staff?',
        origenDeLoop: 'L-BZS-02',
      },
      {
        tipo: 'email_enviado',
        titulo: 'Re: Admin Botafogo',
        autor: 'Santiago',
        hace: 17,
        cuerpo: 'Hi Will, yes: we will schedule the admin call this week and review the DNA files first.',
      },
      {
        tipo: 'email_recibido',
        titulo: 'Onboarding docentes de Year 7',
        autor: 'Patrícia Ramos',
        hace: 11,
        cuerpo:
          'Could we book the onboarding call with the Year 7 teachers in Urca? Thursday or Friday works best for us.',
        origenDeLoop: 'L-BZS-01',
      },
      {
        tipo: 'reunion',
        titulo: 'Kick-off de onboarding',
        autor: 'Richard Shaw',
        hace: 28,
        duracion: 50,
        cuerpo: 'Alineamos el cronograma de onboarding y los hitos de la primera semana.',
        actionItems: [
          { texto: 'Confirmar fechas de capacitación docente' },
          { texto: 'Revisar permisos de admin' },
        ],
      },
      {
        tipo: 'nota',
        titulo: 'Patrícia prefiere reuniones por la mañana',
        autor: 'Santiago',
        hace: 8,
        cuerpo: 'Coordinar siempre antes de las 12 con Urca.',
      },
      {
        tipo: 'registro_interno',
        titulo: 'Owner cambiado a Santiago',
        autor: 'Santiago',
        hace: 22,
        cuerpo: '',
      },
    ],
    tickets: [
      {
        contacto: 'olivia.brown',
        asunto: 'Permisos para Year 7',
        mensaje: 'No puedo ver las asignaciones de mi clase de Year 7 en Urca.',
        estado: 'En curso',
        hace: 4,
        respuestas: [
          { autor: 'Santiago', cuerpo: 'Estamos revisando los permisos del grupo. Te confirmo mañana.', hace: 3 },
        ],
      },
    ],
  },
  {
    nombre: 'Casa Amarilla',
    slug: 'casa-amarilla',
    codigo: 'CAS',
    iniciales: 'CA',
    idioma: 'ES',
    grupoPagador: 'Transforma',
    etapa: 'Piloto',
    owner: 'Marco',
    dominio: 'casamarilla.example',
    docentes: 18,
    health: { actual: 47, hace15: 44 },
    ultimoContactoHace: 4,
    vacios: ['Fecha de go-live', 'Responsable de éxito', 'Inicio de año lectivo'],
    contactos: [
      { local: 'julian.ferrer', nombre: 'Julián Ferrer', cargo: 'Director', rol: 'decisor' },
      { local: 'paula.iglesias', nombre: 'Paula Iglesias', cargo: 'Maestra referente', rol: 'champion' },
      { local: 'marta.acosta', nombre: 'Marta Acosta', cargo: 'Administración', rol: 'admin' },
      { local: 'ana.beltran', nombre: 'Ana Beltrán', cargo: 'Docente de 2° grado', rol: 'docente' },
    ],
    interacciones: [
      {
        tipo: 'reunion',
        titulo: 'Seguimiento del piloto',
        autor: 'Julián Ferrer',
        hace: 20,
        duracion: 35,
        cuerpo: 'Revisamos el uso del piloto y el cronograma de expansión a dos grados más.',
        actionItems: [{ texto: 'Definir fechas de go-live' }],
      },
      {
        tipo: 'email_enviado',
        titulo: 'Re: Plan del piloto',
        autor: 'Marco',
        hace: 18,
        cuerpo: 'Julián, adjunto el plan del piloto con los hitos acordados para las dos primeras semanas.',
      },
      {
        tipo: 'nota',
        titulo: 'Paula sugiere sumar docentes de sala 3',
        autor: 'Marco',
        hace: 6,
        cuerpo: 'Paula propone sumar a las docentes de sala 3 en la segunda etapa del piloto.',
      },
      {
        tipo: 'registro_interno',
        titulo: 'Etapa cambiada a Piloto',
        autor: 'Marco',
        hace: 45,
        cuerpo: '',
      },
    ],
    tickets: [
      {
        contacto: 'paula.iglesias',
        asunto: 'Invitar a dos maestras nuevas',
        mensaje: 'Hola, entraron dos maestras nuevas este mes. ¿Cómo las sumo a la plataforma?',
        estado: 'En curso',
        hace: 3,
        respuestas: [
          {
            autor: 'Marco',
            cuerpo: 'Hola Paula, te paso el paso a paso por email. Necesitamos sus correos institucionales.',
            hace: 2,
          },
        ],
        origenDeLoop: 'L-CAS-01',
      },
    ],
  },
  {
    nombre: 'Grupo Transforma (IE José Olaya)',
    slug: 'jose-olaya',
    codigo: 'TRA',
    iniciales: 'JO',
    idioma: 'ES',
    grupoPagador: 'Transforma',
    etapa: 'Piloto',
    owner: 'Santiago',
    dominio: 'transforma.example',
    docentes: 30,
    health: { actual: 60, hace15: 58 },
    ultimoContactoHace: 1,
    vacios: [],
    contactos: [
      { local: 'esteban.pardo', nombre: 'Esteban Pardo', cargo: 'Director general', rol: 'decisor' },
      { local: 'veronica.salas', nombre: 'Verónica Salas', cargo: 'Coordinadora académica', rol: 'champion' },
      { local: 'julio.sanchez', nombre: 'Julio Sánchez', cargo: 'Coordinador de ciclo', rol: 'liaison' },
      { local: 'rocio.vega', nombre: 'Rocío Vega', cargo: 'Administración', rol: 'admin' },
      { local: 'mateo.quiroga', nombre: 'Mateo Quiroga', cargo: 'Docente de 5° grado', rol: 'docente' },
    ],
    interacciones: [
      {
        tipo: 'reunion',
        titulo: 'Capacitación de coordinadores',
        autor: 'Verónica Salas',
        hace: 26,
        duracion: 45,
        cuerpo:
          'Pedimos una guía corta en español para que los coordinadores revisen observaciones. Necesitamos tenerla antes de la próxima reunión.',
        origenDeLoop: 'L-TRA-02',
      },
      {
        tipo: 'email_enviado',
        titulo: 'Re: Plan de capacitación',
        autor: 'Santiago',
        hace: 15,
        cuerpo: 'Verónica, te comparto el plan de capacitación para el primer mes.',
      },
      {
        tipo: 'nota',
        titulo: 'Verónica prefiere materiales en español',
        autor: 'Santiago',
        hace: 12,
        cuerpo: 'Todo el material para coordinadores debe salir en español.',
      },
      {
        tipo: 'registro_interno',
        titulo: 'Owner cambiado a Santiago',
        autor: 'Santiago',
        hace: 25,
        cuerpo: '',
      },
    ],
    tickets: [
      {
        contacto: 'mateo.quiroga',
        asunto: 'Clave de acceso',
        mensaje: 'No recuerdo mi clave de acceso, ¿me la pueden restablecer?',
        estado: 'Resuelto',
        hace: 10,
        respuestas: [{ autor: 'Santiago', cuerpo: 'Listo, te envié el enlace para restablecerla.', hace: 9 }],
      },
    ],
  },
  {
    nombre: 'Curriculum for Wales (TLG)',
    slug: 'cfw',
    codigo: 'TLG',
    iniciales: 'CW',
    idioma: 'EN',
    etapa: 'Piloto',
    owner: 'Marco',
    dominio: 'tlg.example',
    docentes: 24,
    health: { actual: 59, hace15: 62 },
    ultimoContactoHace: 3,
    vacios: [],
    contactos: [
      { local: 'kelsey.morgan', nombre: 'Kelsey Morgan', cargo: 'Programme Lead', rol: 'decisor' },
      { local: 'nic.jones', nombre: 'Nic Jones', cargo: 'Welsh Language Advisor', rol: 'champion' },
      { local: 'elin.pryce', nombre: 'Elin Pryce', cargo: 'Coordinadora de lengua galesa', rol: 'liaison' },
      { local: 'gwen.davies', nombre: 'Gwen Davies', cargo: 'Administración', rol: 'admin' },
      { local: 'owen.price', nombre: 'Owen Price', cargo: 'Docente', rol: 'docente' },
    ],
    interacciones: [
      {
        tipo: 'email_recibido',
        titulo: 'Demo access for reviewers',
        autor: 'Kelsey Morgan',
        hace: 24,
        cuerpo:
          "Hi, when will the reviewers get the invitation to the demo instance? They are waiting on it for the review call.",
        origenDeLoop: 'L-TLG-01',
      },
      {
        tipo: 'email_recibido',
        titulo: 'Welsh version corrections',
        autor: 'Nic Jones',
        hace: 15,
        cuerpo:
          'Attached are my corrections to the Welsh version of the app and the Evolution legend. Some strings still read awkwardly.',
        origenDeLoop: 'L-TLG-02',
      },
      {
        tipo: 'email_enviado',
        titulo: 'Re: Welsh version corrections',
        autor: 'Marco',
        hace: 14,
        cuerpo: 'Thanks Nic, we are applying your corrections this week.',
      },
      {
        tipo: 'reunion',
        titulo: 'Revisión de traducción',
        autor: 'Nic Jones',
        hace: 9,
        duracion: 40,
        cuerpo: 'Recorrimos la leyenda de Evolution en galés. Confirmó la mayoría de los textos.',
        actionItems: [{ texto: 'Enviar la leyenda corregida' }],
      },
    ],
    tickets: [
      {
        contacto: 'owen.price',
        asunto: 'Consulta sobre Evolution',
        mensaje: "What does 'Forming' mean in the Evolution distribution?",
        estado: 'Resuelto',
        hace: 20,
        respuestas: [
          {
            autor: 'Marco',
            cuerpo: 'It means the student has started showing the skill but is not consistent yet.',
            hace: 19,
          },
        ],
      },
    ],
  },
  {
    nombre: 'Colegio Colombo Británico (CCB)',
    slug: 'ccb',
    codigo: 'CCB',
    iniciales: 'CC',
    idioma: 'EN',
    etapa: 'Live',
    owner: 'Ignacio',
    dominio: 'ccb.example',
    docentes: 41,
    health: { actual: 64, hace15: 60 },
    ultimoContactoHace: 2,
    vacios: [],
    contactos: [
      { local: 'peter.holm', nombre: 'Peter Holm', cargo: 'Head of School', rol: 'decisor' },
      { local: 'andrea.lucas', nombre: 'Andrea Lucas', cargo: 'Coordinadora PYP', rol: 'champion' },
      { local: 'laura.pineda', nombre: 'Laura Pineda', cargo: 'Secretaría académica', rol: 'liaison' },
      { local: 'ruth.adler', nombre: 'Ruth Adler', cargo: 'Administración', rol: 'admin' },
      { local: 'carlos.vidal', nombre: 'Carlos Vidal', cargo: 'Docente de Year 5', rol: 'docente' },
    ],
    interacciones: [
      {
        tipo: 'email_recibido',
        titulo: 'Calendar and term dates',
        autor: 'Laura Pineda',
        hace: 8,
        cuerpo:
          'Hi, which format do you need for the calendar and the closing dates of each term? We have the dates ready but want to load them correctly.',
        origenDeLoop: 'L-CCB-02',
      },
      {
        tipo: 'email_enviado',
        titulo: 'Re: Calendar and term dates',
        autor: 'Ignacio',
        hace: 6,
        cuerpo: 'Hi Laura, we need a CSV with start and end dates per term. We will send the template today.',
      },
      {
        tipo: 'reunion',
        titulo: 'Revisión de Live: primer trimestre',
        autor: 'Peter Holm',
        hace: 30,
        duracion: 30,
        cuerpo: 'Balance del primer trimestre en Live. Se pide más detalle en los reportes.',
        actionItems: [{ texto: 'Revisar el formato de reporte por trimestre' }],
      },
      {
        tipo: 'nota',
        titulo: 'Ruth necesita acceso de admin',
        autor: 'Ignacio',
        hace: 3,
        cuerpo: 'Ruth pidió acceso de administración para cargar altas de docentes nuevos.',
      },
    ],
    tickets: [
      {
        contacto: 'carlos.vidal',
        asunto: 'Cambiar el idioma de la plataforma',
        mensaje: 'Necesitamos pasar la plataforma a inglés para Year 5 desde el próximo mes.',
        estado: 'Nuevo',
        hace: 0.05,
      },
    ],
  },
  {
    nombre: 'St. Francis',
    slug: 'st-francis',
    codigo: 'SF',
    iniciales: 'SF',
    idioma: 'EN',
    etapa: 'Live',
    owner: 'Santiago',
    dominio: 'stfrancis.example',
    docentes: 33,
    health: { actual: 87, hace15: 85 },
    ultimoContactoHace: 1,
    vacios: [],
    contactos: [
      { local: 'angela.moore', nombre: 'Angela Moore', cargo: 'Principal', rol: 'decisor' },
      { local: 'jeff.lawson', nombre: 'Jeff Lawson', cargo: 'PYP Coordinator', rol: 'champion' },
      { local: 'rahul.mehta', nombre: 'Rahul Mehta', cargo: 'Platform admin', rol: 'admin' },
      { local: 'camila.rocha', nombre: 'Camila Rocha', cargo: 'Docente PYP 2', rol: 'liaison' },
    ],
    interacciones: [
      {
        tipo: 'reunion',
        titulo: 'Sync PYP: objetivos de especialistas',
        autor: 'Jeff Lawson',
        hace: 14,
        duracion: 45,
        cuerpo:
          'We reviewed how PE and Portuguese learning objectives show up in observations and reports. Parents see them in the summary but not in the detail view.',
        actionItems: [
          { texto: 'Revisar objetivos de PE y Portugués en observaciones', loopId: 'L-SF-01' },
          { texto: 'Confirmar con Tech el reporte de Portugués' },
        ],
        origenDeLoop: 'L-SF-01',
      },
      {
        tipo: 'email_enviado',
        titulo: 'Re: Objetivos de especialistas',
        autor: 'Santiago',
        hace: 13,
        cuerpo: 'Jeff, gracias por la reunión. Ya tenemos los puntos y te respondemos esta semana.',
      },
      {
        tipo: 'nota',
        titulo: 'Jeff quiere un piloto de reportes en Q1',
        autor: 'Santiago',
        hace: 5,
        cuerpo: 'Interesado en habilitar reportes nuevos para el primer trimestre del año que viene.',
      },
      {
        tipo: 'registro_interno',
        titulo: 'Etapa cambiada a Live',
        autor: 'Santiago',
        hace: 60,
        cuerpo: '',
      },
    ],
    tickets: [
      {
        contacto: 'camila.rocha',
        asunto: 'No puede subir audios desde Android',
        mensaje: 'Intento subir observaciones de audio desde mi teléfono Android y la carga no termina.',
        estado: 'En curso',
        hace: 9,
        respuestas: [
          {
            autor: 'Santiago',
            cuerpo: 'Estamos revisando con Tech. ¿Nos podés decir la versión de Android que usás?',
            hace: 8,
          },
        ],
        origenDeLoop: 'L-SF-02',
      },
      {
        contacto: 'rahul.mehta',
        asunto: 'Consulta de exportación',
        mensaje: '¿Se puede exportar el listado de docentes activos en un solo archivo?',
        estado: 'Resuelto',
        hace: 16,
        respuestas: [{ autor: 'Santiago', cuerpo: 'Listo, la exportación ya está habilitada.', hace: 15 }],
      },
    ],
  },
  {
    nombre: 'British Barra',
    slug: 'bsrjb',
    codigo: 'BB',
    iniciales: 'BB',
    idioma: 'EN',
    grupoPagador: 'British',
    etapa: 'Live',
    owner: 'Santiago',
    dominio: 'britishbarra.example',
    docentes: 29,
    health: { actual: 76, hace15: 79 },
    ultimoContactoHace: 2,
    vacios: [],
    contactos: [
      { local: 'ben.holloway', nombre: 'Ben Holloway', cargo: 'Head of Campus', rol: 'decisor' },
      { local: 'sarah.lim', nombre: 'Sarah Lim', cargo: 'Coordinadora de currículo', rol: 'champion' },
      { local: 'tina.ortega', nombre: 'Tina Ortega', cargo: 'Administración', rol: 'admin' },
      { local: 'diego.cruz', nombre: 'Diego Cruz', cargo: 'Docente de Year 3', rol: 'liaison' },
    ],
    interacciones: [
      {
        tipo: 'reunion',
        titulo: 'Propuesta de currículo: Primary + Nursery',
        autor: 'Ben Holloway',
        hace: 18,
        duracion: 60,
        cuerpo: 'Ben pidió una propuesta para sumar Primary (Y1–Y5) y Nursery al currículo IB actual.',
        actionItems: [{ texto: 'Sumar Primary (Y1–Y5) y Nursery al currículo IB y enviar la propuesta' }],
        origenDeLoop: 'L-BB-02',
      },
      {
        tipo: 'email_recibido',
        titulo: 'Reunión con Ben y capacitación de staff',
        autor: 'Ben Holloway',
        hace: 5,
        cuerpo: 'Can we set a date for the meeting and the staff training? Ideally before half term.',
        origenDeLoop: 'L-BB-03',
      },
      {
        tipo: 'email_enviado',
        titulo: 'Re: Capacitación de staff',
        autor: 'Santiago',
        hace: 4,
        cuerpo: 'Ben, we are checking availability with Sarah and will send two options today.',
      },
      {
        tipo: 'nota',
        titulo: 'Sarah lidera el currículo',
        autor: 'Santiago',
        hace: 10,
        cuerpo: 'Sarah es la referente para cualquier cambio de currículo.',
      },
      {
        tipo: 'registro_interno',
        titulo: 'Owner cambiado a Santiago',
        autor: 'Santiago',
        hace: 30,
        cuerpo: '',
      },
    ],
    tickets: [
      {
        contacto: 'diego.cruz',
        asunto: 'Duplicado de usuarios',
        mensaje: 'Some teachers appear twice in the staff list after the import. Can you check?',
        estado: 'Nuevo',
        hace: 3,
      },
    ],
  },
];
