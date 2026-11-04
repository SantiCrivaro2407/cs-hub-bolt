const DIA_MS = 24 * 60 * 60 * 1000;

export function diasAtras(dias: number, hora = 10, minuto = 0, ahora = new Date()): string {
  const fecha = new Date(ahora);
  fecha.setDate(fecha.getDate() - dias);
  fecha.setHours(hora, minuto, 0, 0);
  return fecha.toISOString();
}

export function diasEntre(desde: string | Date, hasta: Date = new Date()): number {
  const inicio = new Date(desde);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(hasta);
  fin.setHours(0, 0, 0, 0);
  return Math.round((fin.getTime() - inicio.getTime()) / DIA_MS);
}

export function diasHabilesEntre(desde: string | Date, hasta: Date = new Date()): number {
  const cursor = new Date(desde);
  cursor.setHours(0, 0, 0, 0);
  const fin = new Date(hasta);
  fin.setHours(0, 0, 0, 0);
  let habiles = 0;
  while (cursor < fin) {
    cursor.setDate(cursor.getDate() + 1);
    const dia = cursor.getDay();
    if (dia !== 0 && dia !== 6) habiles += 1;
  }
  return habiles;
}

export function hacePlural(dias: number): string {
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'hace 1 día';
  return `hace ${dias} días`;
}

const formatoFechaCorta = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });
const formatoHora = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });
const formatoFechaHora = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const formatoMes = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' });
const formatoFechaLarga = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function fechaCorta(iso: string): string {
  return formatoFechaCorta.format(new Date(iso));
}

export function fechaHora(iso: string): string {
  return formatoFechaHora.format(new Date(iso)).replace(',', ' ·');
}

export function horaMinuto(iso: string): string {
  return formatoHora.format(new Date(iso));
}

export function fechaLarga(iso: string): string {
  return formatoFechaLarga.format(new Date(iso));
}

export function claveMes(iso: string): string {
  const fecha = new Date(iso);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

export function nombreMes(clave: string): string {
  const [anio, mes] = clave.split('-').map(Number);
  return formatoMes.format(new Date(anio, mes - 1, 1));
}
