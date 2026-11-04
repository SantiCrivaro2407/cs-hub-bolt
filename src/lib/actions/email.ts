import { insertarInteraccion, type ContextoAccion } from '@/lib/actions/base';
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
}

export async function enviarEmail(
  ctx: ContextoAccion,
  escuela: Escuela,
  envio: EnvioEmail,
  vinculo: VinculoEmail = {},
): Promise<void> {
  if (!destinatariosValidos(envio.para, escuela.dominio_staff)) {
    throw new Error('Solo se puede escribir a direcciones de staff de la escuela');
  }
  await insertarInteraccion({
    escuela_id: escuela.id,
    tipo: 'email_enviado',
    titulo: envio.asunto,
    autor: ctx.yo.nombre,
    cuerpo: `Para: ${envio.para.join(', ')}\n\n${envio.cuerpo}`,
    loop_id: vinculo.loopId ?? null,
    ticket_id: vinculo.ticketId ?? null,
  });
}
