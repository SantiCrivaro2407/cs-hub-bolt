import type { FichaCampo } from '@/lib/types';

export interface SeccionFicha {
  nombre: string;
  campos: FichaCampo[];
  llenos: number;
  pct: number;
  critica: boolean;
  criticosVacios: number;
}

export interface ResumenFicha {
  secciones: SeccionFicha[];
  pct: number;
  criticosVacios: number;
  listaParaGoLive: boolean;
}

export function campoLleno(campo: FichaCampo): boolean {
  return Boolean(campo.valor && campo.valor.trim().length > 0);
}

export function porcentaje(llenos: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((llenos / total) * 100);
}

export function resumenFicha(campos: FichaCampo[]): ResumenFicha {
  const porSeccion = new Map<string, FichaCampo[]>();
  for (const campo of [...campos].sort((a, b) => a.orden - b.orden)) {
    const lista = porSeccion.get(campo.seccion) ?? [];
    lista.push(campo);
    porSeccion.set(campo.seccion, lista);
  }

  const secciones: SeccionFicha[] = [...porSeccion.entries()].map(([nombre, lista]) => {
    const llenos = lista.filter(campoLleno).length;
    const criticosVacios = lista.filter((campo) => campo.critico && !campoLleno(campo)).length;
    return {
      nombre,
      campos: lista,
      llenos,
      pct: porcentaje(llenos, lista.length),
      critica: lista.some((campo) => campo.critico),
      criticosVacios,
    };
  });

  const llenosTotal = campos.filter(campoLleno).length;
  const criticosVacios = secciones.reduce((acc, seccion) => acc + seccion.criticosVacios, 0);
  const seccionesCriticasIncompletas = secciones.some((seccion) => seccion.critica && seccion.pct < 100);

  return {
    secciones,
    pct: porcentaje(llenosTotal, campos.length),
    criticosVacios,
    listaParaGoLive: criticosVacios === 0 && !seccionesCriticasIncompletas,
  };
}
