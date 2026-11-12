/**
 * Devuelve la URL solo si es https y su host es uno de los esperados (o un subdominio).
 * Los links guardados en la base (grabaciones, Linear, Read AI) los puede escribir cualquier miembro
 * o un webhook externo: sin este filtro un `javascript:` llegaría a un href o al src de un iframe.
 */
export function urlSegura(valor: string | null | undefined, hosts: string[]): string | null {
  if (!valor) return null;
  let url: URL;
  try {
    url = new URL(valor.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase();
  return hosts.some((h) => host === h || host.endsWith(`.${h}`)) ? url.toString() : null;
}

export const HOSTS_POSTHOG = ['posthog.com'];
export const HOSTS_LINEAR = ['linear.app'];
export const HOSTS_READAI = ['read.ai'];
