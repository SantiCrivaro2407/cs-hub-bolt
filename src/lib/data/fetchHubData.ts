import { supabase } from '@/lib/supabase';
import type {
  Contacto,
  Equipo,
  Escuela,
  FichaCampo,
  HealthSnapshot,
  HubData,
  Integracion,
  Interaccion,
  Issue,
  Loop,
  LoopEstado,
  Ticket,
  TicketMensaje,
} from '@/lib/types';

interface ConsultaTabla {
  tabla: string;
  orden?: string;
}

async function leerTabla<T>({ tabla, orden }: ConsultaTabla): Promise<T[]> {
  let consulta = supabase.from(tabla).select('*');
  if (orden) consulta = consulta.order(orden, { ascending: true });
  const { data, error } = await consulta;
  if (error) throw new Error(`No se pudo leer ${tabla}: ${error.message}`);
  return (data ?? []) as T[];
}

// Las integraciones llegan con una migración aparte: si la tabla todavía no existe, el backoffice sigue andando.
async function leerIntegraciones(): Promise<Integracion[]> {
  const { data, error } = await supabase.from('integraciones').select('*');
  if (error) {
    console.warn(`Integraciones no disponibles: ${error.message}`);
    return [];
  }
  return data as Integracion[];
}

export async function cargarHubData(): Promise<HubData> {
  const [equipo, escuelas, contactos, fichaCampos, snapshots, interacciones, tickets, ticketMensajes, loops, loopEstados, issues, integraciones] =
    await Promise.all([
      leerTabla<Equipo>({ tabla: 'equipo', orden: 'nombre' }),
      leerTabla<Escuela>({ tabla: 'escuelas', orden: 'nombre' }),
      leerTabla<Contacto>({ tabla: 'contactos' }),
      leerTabla<FichaCampo>({ tabla: 'ficha_campos', orden: 'orden' }),
      leerTabla<HealthSnapshot>({ tabla: 'health_snapshots', orden: 'fecha' }),
      leerTabla<Interaccion>({ tabla: 'interacciones', orden: 'fecha' }),
      leerTabla<Ticket>({ tabla: 'tickets', orden: 'creado' }),
      leerTabla<TicketMensaje>({ tabla: 'ticket_mensajes', orden: 'fecha' }),
      leerTabla<Loop>({ tabla: 'loops', orden: 'creado' }),
      leerTabla<LoopEstado>({ tabla: 'loop_estados', orden: 'fecha' }),
      leerTabla<Issue>({ tabla: 'issues', orden: 'id' }),
      leerIntegraciones(),
    ]);

  return {
    equipo,
    escuelas,
    contactos,
    fichaCampos,
    snapshots,
    interacciones,
    tickets,
    ticketMensajes,
    loops,
    loopEstados,
    issues,
    integraciones,
  };
}
