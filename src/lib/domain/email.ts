export function destinatariosValidos(emails: string[], dominio: string): boolean {
  return emails.length > 0 && emails.every((email) => emailEsDeStaff(email, dominio));
}

/** `dominio` puede traer varios dominios separados por coma (una escuela con más de un dominio). */
export function emailEsDeStaff(email: string, dominio: string): boolean {
  const partes = email.trim().toLowerCase().split('@');
  const dominios = dominio.split(',').map((d) => d.trim().toLowerCase().replace(/^@/, ''));
  return partes.length === 2 && partes[0].length > 0 && dominios.includes(partes[1]);
}

export const AVISO_SOLO_STAFF = 'Solo se puede escribir a direcciones de staff de la escuela';

/** Formato básico de una dirección: algo@dominio.ext, sin espacios. */
export function emailConFormato(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Las dos organizaciones que pueden tener cuenta (la base lo vuelve a controlar: ver migración registro_por_dominio).
export const DOMINIOS_PERMITIDOS = ['volantisedu.com', 'itba.edu.ar'];

export function dominioPermitido(email: string): boolean {
  return DOMINIOS_PERMITIDOS.includes(email.trim().toLowerCase().split('@')[1] ?? '');
}
