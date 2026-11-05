import type { EquipoIssue, EstadoIssue, OrigenLoop } from '@/lib/types';

export interface LoopDemo {
  id: string;
  escuela: string;
  titulo: string;
  quePidio: string;
  espera: string;
  owner: string;
  origen: OrigenLoop;
  hace: number;
}

export interface IssueDemo {
  id: string;
  escuela: string;
  titulo: string;
  equipo: EquipoIssue;
  estado: EstadoIssue;
  asignado: string;
  hace: number;
  loop?: string;
  descripcion?: string;
}

export const LOOPS_DEMO: LoopDemo[] = [
  {
    id: 'L-BZS-02',
    escuela: 'bsrjzs',
    titulo: 'Acceso admin Botafogo + archivos de la escuela',
    quePidio:
      'Will pidió una llamada de admin para Botafogo y que revisemos los archivos DNA de la escuela antes de invitar al resto.',
    espera: 'will.harper',
    owner: 'Santiago',
    origen: 'email',
    hace: 19,
  },
  {
    id: 'L-COL-02',
    escuela: 'clc',
    titulo: 'Orden de materias en los reportes',
    quePidio: 'Las materias salen en orden alfabético y no en el orden del colegio.',
    espera: 'ben.carter',
    owner: 'Marco',
    origen: 'email',
    hace: 16,
  },
  {
    id: 'L-SF-01',
    escuela: 'st-francis',
    titulo: 'Objetivos de aprendizaje en currículos de especialistas',
    quePidio:
      'Jeff pidió que los objetivos de PE y Portugués aparezcan bien en las observaciones y reportes.',
    espera: 'jeff.lawson',
    owner: 'Santiago',
    origen: 'reunion',
    hace: 14,
  },
  {
    id: 'L-CCB-02',
    escuela: 'ccb',
    titulo: 'Fechas importantes y calendario',
    quePidio: 'Laura preguntó qué formato necesitamos para cargar el calendario y las fechas de cierre de período.',
    espera: 'laura.pineda',
    owner: 'Ignacio',
    origen: 'email',
    hace: 8,
  },
  {
    id: 'L-COL-01',
    escuela: 'clc',
    titulo: 'Feedback de Experiencias (llamada del 7/10)',
    quePidio: 'Emese quiere ver los estándares ligados dentro de cada observación de Experiencias.',
    espera: 'emese.varga',
    owner: 'Marco',
    origen: 'reunion',
    hace: 10,
  },
  {
    id: 'L-ALE-01',
    escuela: 'aleph',
    titulo: 'Exportar observaciones a Excel',
    quePidio: 'La coordinadora quiere bajar las observaciones de su grupo a una planilla.',
    espera: 'sofia.trevino',
    owner: 'Ignacio',
    origen: 'ticket',
    hace: 6,
  },
  {
    id: 'L-TLG-02',
    escuela: 'cfw',
    titulo: 'Revisión de la versión en galés',
    quePidio: 'Nic mandó correcciones a la versión en galés de la app y la leyenda de Evolution.',
    espera: 'nic.jones',
    owner: 'Marco',
    origen: 'email',
    hace: 15,
  },
  {
    id: 'L-BZS-01',
    escuela: 'bsrjzs',
    titulo: 'Onboarding docentes de Year 7 (Urca)',
    quePidio: 'Agendar la llamada de onboarding con los docentes de Year 7 de Urca.',
    espera: 'patricia.ramos',
    owner: 'Santiago',
    origen: 'email',
    hace: 11,
  },
  {
    id: 'L-TLG-01',
    escuela: 'cfw',
    titulo: 'Acceso de revisores a la instancia demo',
    quePidio: 'Kelsey preguntó cuándo reciben los revisores la invitación a la instancia demo.',
    espera: 'kelsey.morgan',
    owner: 'Marco',
    origen: 'email',
    hace: 24,
  },
  {
    id: 'L-BB-02',
    escuela: 'bsrjb',
    titulo: 'Propuesta de currículo: Primary + Nursery',
    quePidio:
      'Sumar las materias de Primary (Y1–Y5) y Nursery al currículo IB actual y mandar la propuesta.',
    espera: 'ben.holloway',
    owner: 'Santiago',
    origen: 'reunion',
    hace: 18,
  },
  {
    id: 'L-BB-03',
    escuela: 'bsrjb',
    titulo: 'Reunión con Ben + capacitación docente',
    quePidio: 'Proponer fecha para la reunión con Ben y para la capacitación del staff.',
    espera: 'ben.holloway',
    owner: 'Santiago',
    origen: 'email',
    hace: 5,
  },
  {
    id: 'L-SF-02',
    escuela: 'st-francis',
    titulo: 'No puede subir audios desde Android',
    quePidio: 'Una docente de PYP 2 no puede subir observaciones de audio desde su teléfono.',
    espera: 'camila.rocha',
    owner: 'Santiago',
    origen: 'ticket',
    hace: 9,
  },
  {
    id: 'L-ALE-02',
    escuela: 'aleph',
    titulo: 'Cómo cargar el calendario académico',
    quePidio: 'Explicar qué fechas necesitamos para cargar el calendario y los períodos de reporte.',
    espera: 'daniela.ortiz',
    owner: 'Ignacio',
    origen: 'manual',
    hace: 13,
  },
  {
    id: 'L-CAS-01',
    escuela: 'casa-amarilla',
    titulo: 'Invitar a dos maestras nuevas',
    quePidio: 'Paula preguntó cómo sumar a dos maestras que entraron este mes.',
    espera: 'paula.iglesias',
    owner: 'Marco',
    origen: 'ticket',
    hace: 3,
  },
  {
    id: 'L-TRA-02',
    escuela: 'jose-olaya',
    titulo: 'Guía en español para coordinadores',
    quePidio: 'Mandar una guía corta en español para que los coordinadores revisen observaciones.',
    espera: 'veronica.salas',
    owner: 'Santiago',
    origen: 'reunion',
    hace: 26,
  },
];

export const ISSUES_DEMO: IssueDemo[] = [
  { id: 'CS-147', escuela: 'bsrjzs', titulo: 'Habilitar admin de Botafogo', equipo: 'CS', estado: 'Done', asignado: 'Santiago', hace: 17, loop: 'L-BZS-02', descripcion: 'Dar permisos de admin a la coordinación de Botafogo para que pueda invitar docentes sin pasar por CS.' },
  { id: 'CS-171', escuela: 'bsrjzs', titulo: 'Revisar archivos DNA de la escuela', equipo: 'CS', estado: 'Done', asignado: 'Santiago', hace: 16, loop: 'L-BZS-02', descripcion: 'Revisar que los archivos DNA (terminología, metodología, estructura) reflejen lo acordado en el kickoff.' },
  { id: 'CS-182', escuela: 'bsrjzs', titulo: 'Agendar onboarding de Year 7', equipo: 'CS', estado: 'In Progress', asignado: 'Santiago', hace: 3, loop: 'L-BZS-01', descripcion: 'Coordinar fecha y agenda del onboarding para los docentes de Year 7. Esperamos confirmación de la coordinadora.' },
  { id: 'TECH-1755', escuela: 'bsrjzs', titulo: 'Sincronización de roster Botafogo', equipo: 'Tech', estado: 'Todo', asignado: 'Franco', hace: 2, descripcion: 'El roster de Botafogo no se sincroniza desde el SIS desde el lunes. Faltan 12 alumnos nuevos de Year 3.' },
  { id: 'CS-140', escuela: 'aleph', titulo: 'Calendario académico cargado', equipo: 'CS', estado: 'Done', asignado: 'Ignacio', hace: 16, descripcion: 'Cargar el calendario académico 2026 con los períodos de evaluación.' },
  { id: 'TECH-1790', escuela: 'aleph', titulo: 'Exportar observaciones a Excel', equipo: 'Tech', estado: 'Backlog', asignado: 'Sin asignar', hace: 6, loop: 'L-ALE-01', descripcion: 'La escuela pide exportar las observaciones de un grupo a Excel para el informe trimestral. Definir columnas y permisos.' },
  { id: 'TECH-1744', escuela: 'clc', titulo: 'Orden alfabético de materias en reportes', equipo: 'Tech', estado: 'Done', asignado: 'Franco', hace: 3, loop: 'L-COL-02', descripcion: 'Los reportes muestran las materias en el orden de carga; la escuela las quiere en orden alfabético.' },
  { id: 'CS-180', escuela: 'clc', titulo: 'Estándares dentro de observaciones de Experiencias', equipo: 'CS', estado: 'In Progress', asignado: 'Marco', hace: 4, loop: 'L-COL-01', descripcion: 'Mostrar los estándares vinculados dentro de cada observación de Experiencias, como ya pasa en las observaciones de clase.' },
  { id: 'CS-155', escuela: 'clc', titulo: 'Exportar reportes en PDF', equipo: 'CS', estado: 'In Review', asignado: 'Marco', hace: 6, descripcion: 'Permitir descargar los reportes de Evolution en PDF para compartir con familias.' },
  { id: 'CS-169', escuela: 'st-francis', titulo: 'Objetivos de PE y Portugués en observaciones', equipo: 'CS', estado: 'Done', asignado: 'Santiago', hace: 13, loop: 'L-SF-01', descripcion: 'Agregar los objetivos de PE y Portugués al currículo para que aparezcan al observar.' },
  { id: 'TECH-1771', escuela: 'st-francis', titulo: 'Subida de audios desde Android', equipo: 'Tech', estado: 'In Progress', asignado: 'Franco', hace: 1, loop: 'L-SF-02', descripcion: 'Los docentes con Android no pueden subir audios mayores a 1 minuto: la subida queda colgada al 90 %.' },
  { id: 'CS-178', escuela: 'ccb', titulo: 'Formato de carga del calendario', equipo: 'CS', estado: 'Todo', asignado: 'Ignacio', hace: 7, loop: 'L-CCB-02', descripcion: 'Acordar con la escuela el formato del archivo para cargar el calendario (fechas en DD/MM).' },
  { id: 'TECH-1700', escuela: 'ccb', titulo: 'Feed desde el SIS', equipo: 'Tech', estado: 'Canceled', asignado: 'Franco', hace: 40, descripcion: 'Integración del feed del SIS. Cancelada: la escuela cambia de SIS el año que viene.' },
  { id: 'CS-173', escuela: 'cfw', titulo: 'Correcciones de la versión en galés', equipo: 'CS', estado: 'Done', asignado: 'Marco', hace: 9, loop: 'L-TLG-02', descripcion: 'Aplicar las correcciones de traducción que mandó la escuela para la versión en galés.' },
  { id: 'CS-181', escuela: 'cfw', titulo: 'Leyenda de Evolution en galés', equipo: 'CS', estado: 'In Progress', asignado: 'Marco', hace: 2, loop: 'L-TLG-02', descripcion: 'Traducir la leyenda de los niveles de Evolution al galés.' },
  { id: 'CS-184', escuela: 'cfw', titulo: 'Invitación a revisores', equipo: 'CS', estado: 'Todo', asignado: 'Marco', hace: 15, loop: 'L-TLG-01', descripcion: 'Invitar a los dos revisores externos que validan la traducción al galés.' },
  { id: 'CS-160', escuela: 'cfw', titulo: 'Traducción de Evolution', equipo: 'CS', estado: 'Backlog', asignado: 'Marco', hace: 12, descripcion: 'Traducción completa de los textos de Evolution al galés.' },
  { id: 'CS-176', escuela: 'casa-amarilla', titulo: 'Plan de expansión a sala 3', equipo: 'CS', estado: 'Backlog', asignado: 'Marco', hace: 5, descripcion: 'Armar la propuesta para sumar la sala de 3 al uso de la plataforma el próximo ciclo.' },
  { id: 'TECH-1760', escuela: 'bsrjb', titulo: 'Currículo Primary y Nursery en IB', equipo: 'Tech', estado: 'In Progress', asignado: 'Franco', hace: 6, loop: 'L-BB-02', descripcion: 'Cargar el currículo IB de Primary y Nursery con sus learner profiles.' },
  { id: 'CS-185', escuela: 'bsrjb', titulo: 'Agendar capacitación de staff', equipo: 'CS', estado: 'In Progress', asignado: 'Santiago', hace: 2, loop: 'L-BB-03', descripcion: 'Agendar la capacitación de staff de Barra con el equipo de coordinación.' },
];
