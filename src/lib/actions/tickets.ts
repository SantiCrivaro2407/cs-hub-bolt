import { supabase } from '@/lib/supabase';
import { comprobar, insertarInteraccion, nuevoId, registrarCambio, type Avisos, type ContextoAccion } from '@/lib/actions/base';
import { enviarEmail, type EnvioEmail } from '@/lib/actions/email';
import { elegirAlAzar, generarTicketSimulado } from '@/lib/demo/simulacion';
import type { Escuela, EstadoTicket, Ticket } from '@/lib/types';

export async function crearTicketSimulado(ctx: ContextoAccion): Promise<Avisos> {
  const { datos } = ctx;
  const candidatos = datos.escuelas
    .map((escuela) => ({
      escuela,
      contactos: datos.contactos.filter((c) => c.escuela_id === escuela.id && c.email),
    }))
    .filter((c) => c.contactos.length > 0);
  if (candidatos.length === 0) throw new Error('No hay escuelas con contactos para simular un ticket');

  const { escuela, contactos } = elegirAlAzar(candidatos);
  const contacto = elegirAlAzar(contactos);
  const plantilla = generarTicketSimulado(escuela);
  const ahora = new Date().toISOString();
  const ticketId = nuevoId();

  const { error } = await supabase.from('tickets').insert({
    id: ticketId,
    escuela_id: escuela.id,
    contacto_id: contacto.id,
    asunto: plantilla.asunto,
    mensaje: plantilla.mensaje,
    estado: 'Nuevo',
    owner_id: escuela.owner_id,
    creado: ahora,
    actualizado: ahora,
  });
  comprobar(error);
  await insertarInteraccion({
    escuela_id: escuela.id,
    tipo: 'ticket',
    titulo: `Ticket: ${plantilla.asunto}`,
    autor: contacto.nombre,
    cuerpo: plantilla.mensaje,
    ticket_id: ticketId,
  });
  return ['Aviso a Slack (simulado)'];
}

export async function responderTicket(
  ctx: ContextoAccion,
  ticket: Ticket,
  escuela: Escuela,
  envio: EnvioEmail,
  marcarResuelto: boolean,
): Promise<void> {
  await enviarEmail(ctx, escuela, envio, { ticketId: ticket.id });

  const { error: errorMensaje } = await supabase.from('ticket_mensajes').insert({
    id: nuevoId(),
    ticket_id: ticket.id,
    autor: ctx.yo.nombre,
    cuerpo: envio.cuerpo,
    fecha: new Date().toISOString(),
  });
  comprobar(errorMensaje);

  const estado: EstadoTicket = marcarResuelto ? 'Resuelto' : 'En curso';
  const { error } = await supabase
    .from('tickets')
    .update({ estado, actualizado: new Date().toISOString() })
    .eq('id', ticket.id);
  comprobar(error);
}

export async function cambiarEstadoTicket(ctx: ContextoAccion, ticket: Ticket, estado: EstadoTicket): Promise<void> {
  const { error } = await supabase
    .from('tickets')
    .update({ estado, actualizado: new Date().toISOString() })
    .eq('id', ticket.id);
  comprobar(error);
  await registrarCambio(ctx, ticket.escuela_id, `Ticket «${ticket.asunto}» pasó a ${estado}`);
}

export async function cambiarOwnerTicket(ctx: ContextoAccion, ticket: Ticket, ownerId: string): Promise<void> {
  const { error } = await supabase.from('tickets').update({ owner_id: ownerId }).eq('id', ticket.id);
  comprobar(error);
  const nombre = ctx.datos.equipo.find((m) => m.id === ownerId)?.nombre ?? 'sin owner';
  await registrarCambio(ctx, ticket.escuela_id, `Owner del ticket «${ticket.asunto}» cambiado a ${nombre}`);
}
