export function destinatariosValidos(emails: string[], dominio: string): boolean {
  return emails.length > 0 && emails.every((email) => emailEsDeStaff(email, dominio));
}

export function emailEsDeStaff(email: string, dominio: string): boolean {
  const partes = email.trim().toLowerCase().split('@');
  return partes.length === 2 && partes[0].length > 0 && partes[1] === dominio.toLowerCase();
}

export const AVISO_SOLO_STAFF = 'Solo se puede escribir a direcciones de staff de la escuela';
