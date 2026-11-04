export type Idioma = 'ES' | 'EN';
export type Etapa = 'Piloto' | 'Onboarding' | 'Live' | 'Renovación';
export type RolContacto = 'decisor' | 'champion' | 'liaison' | 'admin' | 'docente';
export type TipoInteraccion =
  | 'email_recibido'
  | 'email_enviado'
  | 'reunion'
  | 'ticket'
  | 'nota'
  | 'registro_interno';
export type EstadoTicket = 'Nuevo' | 'En curso' | 'Resuelto';
export type EstadoLoop = 'Open' | 'Waiting' | 'Ready to reply' | 'Closed';
export type OrigenLoop = 'email' | 'reunion' | 'ticket' | 'manual';
export type EquipoIssue = 'CS' | 'Tech';
export type EstadoIssue = 'Backlog' | 'Todo' | 'In Progress' | 'In Review' | 'Done' | 'Canceled';

export interface Equipo {
  id: string;
  nombre: string;
  email: string;
}

export interface Escuela {
  id: string;
  nombre: string;
  slug: string;
  codigo: string;
  iniciales: string;
  idioma: Idioma;
  grupo_pagador: string | null;
  sedes: string | null;
  etapa: Etapa;
  owner_id: string | null;
  dominio_staff: string;
  ultimo_contacto: string | null;
}

export interface Contacto {
  id: string;
  escuela_id: string;
  nombre: string;
  cargo: string | null;
  email: string | null;
  rol: RolContacto;
}

export interface FichaCampo {
  id: string;
  escuela_id: string;
  seccion: string;
  grupo: string | null;
  campo: string;
  valor: string | null;
  critico: boolean;
  orden: number;
}

export interface HealthMetricas {
  activacion: {
    docentes_invitados: number;
    invitaciones_vencidas: number;
    bloqueos_setup: number;
  };
  engagement: {
    docentes_total: number;
    docentes_activos: number;
    uso_semana_pct: number;
    uso_semana_anterior_pct: number;
    observaciones_semana: number;
    observaciones_por_docente: number;
    docentes_3_mas_obs: number;
    docentes_en_riesgo: number;
  };
  calidad: {
    calidad_promedio: number;
    docentes_70_mas: number;
    matches_por_obs: number;
    personalizacion_pct: number;
  };
  cobertura: {
    alumnos_total: number;
    alumnos_observados_15d: number;
    curriculo_cubierto_pct: number;
  };
  resultados: {
    evolution_reports: number;
    alumnos_con_evolution: number;
    distribucion: {
      unseen: number;
      forming: number;
      struggling: number;
      mixed: number;
      growing: number;
    };
  };
}

export interface HealthSnapshot {
  id: string;
  escuela_id: string;
  fecha: string;
  activacion: number;
  engagement: number;
  calidad: number;
  cobertura: number;
  resultados: number;
  metricas: HealthMetricas;
}

export interface ActionItem {
  id: string;
  texto: string;
  loop_id: string | null;
}

export interface Interaccion {
  id: string;
  escuela_id: string;
  tipo: TipoInteraccion;
  titulo: string;
  autor: string;
  fecha: string;
  cuerpo: string;
  duracion_min: number | null;
  action_items: ActionItem[];
  loop_id: string | null;
  ticket_id: string | null;
}

export interface Ticket {
  id: string;
  escuela_id: string;
  contacto_id: string | null;
  asunto: string;
  mensaje: string;
  estado: EstadoTicket;
  owner_id: string | null;
  creado: string;
  actualizado: string;
}

export interface TicketMensaje {
  id: string;
  ticket_id: string;
  autor: string;
  cuerpo: string;
  fecha: string;
}

export interface Loop {
  id: string;
  escuela_id: string;
  titulo: string;
  que_pidio: string;
  quien_espera: string | null;
  owner_id: string | null;
  origen: OrigenLoop;
  origen_interaccion_id: string | null;
  estado: EstadoLoop;
  creado: string;
  cerrado: string | null;
}

export interface LoopEstado {
  id: string;
  loop_id: string;
  estado: EstadoLoop;
  fecha: string;
}

export interface Issue {
  id: string;
  escuela_id: string;
  titulo: string;
  equipo: EquipoIssue;
  estado: EstadoIssue;
  asignado: string;
  actualizada: string;
  loop_id: string | null;
}

export interface HubData {
  equipo: Equipo[];
  escuelas: Escuela[];
  contactos: Contacto[];
  fichaCampos: FichaCampo[];
  snapshots: HealthSnapshot[];
  interacciones: Interaccion[];
  tickets: Ticket[];
  ticketMensajes: TicketMensaje[];
  loops: Loop[];
  loopEstados: LoopEstado[];
  issues: Issue[];
}
