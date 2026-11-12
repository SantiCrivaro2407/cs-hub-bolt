import { supabase } from '@/lib/supabase';
import { ErrorVisible, insertarInteraccion, type Avisos, type ContextoAccion } from '@/lib/actions/base';
import { miIntegracion } from '@/lib/actions/integraciones';
import { destinatariosValidos } from '@/lib/domain/email';
import type { Escuela } from '@/lib/types';

export interface EnvioEmail {
  asunto: string;
  cuerpo: string;
  para: string[];
}

export interface VinculoEmail {
  loopId?: string | null;
  ticketId?: string | null;
  // Interacción a la que se responde: si vino de Gmail, la respuesta va en el mismo hilo.
  respondeA?: string | null;
}

/** Si el miembro conectó Gmail con permiso de envío, sale de verdad desde su casilla; si no, queda solo registrado. */
export function puedeEnviarDeVerdad(ctx: ContextoAccion): boolean {
  return Boolean(miIntegracion(ctx, 'gmail')?.config.envio);
}

export async function enviarEmail(
  ctx: ContextoAccion,
  escuela: Escuela,
  envio: EnvioEmail,
  vinculo: VinculoEmail = {},
): Promise<Avisos> {
  if (!destinatariosValidos(envio.para, escuela.dominio_staff)) {
    throw new ErrorVisible('Solo se puede escribir a direcciones de staff de la escuela');
  }
  if (puedeEnviarDeVerdad(ctx)) {
    const { error } = await supabase.functions.invoke('gmail-enviar', {
      body: {
        escuela_id: escuela.id,
        para: envio.para,
        asunto: envio.asunto,
        cuerpo: envio.cuerpo,
        responde_a: vinculo.respondeA ?? null,
        loop_id: vinculo.loopId ?? null,
        ticket_id: vinculo.ticketId ?? null,
      },
    });
    if (error) {
      const detalle = await (error as { context?: Response }).context?.json?.().catch(() => null);
      throw new ErrorVisible(detalle?.error ?? 'No se pudo enviar el email.');
    }
    return ['Enviado desde tu Gmail'];
  }
  await insertarInteraccion({
    escuela_id: escuela.id,
    tipo: 'email_enviado',
    titulo: envio.asunto,
    autor: ctx.yo.nombre,
    cuerpo: `Para: ${envio.para.join(', ')}\n\n${envio.cuerpo}`,
    loop_id: vinculo.loopId ?? null,
    ticket_id: vinculo.ticketId ?? null,
    hilo: hiloDeRespuesta(ctx, vinculo.respondeA),
  });
  return ['Registrado en el hub (conectá Gmail para enviarlo de verdad)'];
}

/** Una respuesta va en el hilo del mensaje original (o abre uno nuevo con su id). */
function hiloDeRespuesta(ctx: ContextoAccion, respondeA: string | null | undefined): string | null {
  if (!respondeA) return null;
  const original = ctx.datos.interacciones.find((i) => i.id === respondeA);
  return original?.hilo ?? `id:${respondeA}`;
}
