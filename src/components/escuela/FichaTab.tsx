import { useState } from 'react';
import { ChevronDown, Pencil } from 'lucide-react';
import { Boton } from '@/components/ui/Boton';
import { Pill } from '@/components/ui/Insignias';
import { useHub } from '@/context/HubContext';
import { guardarCamposFicha, type CambioCampo } from '@/lib/actions/escuelas';
import { campoLleno, resumenFicha } from '@/lib/domain/ficha';
import type { Escuela, FichaCampo } from '@/lib/types';

export function FichaTab({ escuela }: { escuela: Escuela }) {
  const { datos, ctx, ejecutar } = useHub();
  const campos = datos.fichaCampos.filter((c) => c.escuela_id === escuela.id);
  const resumen = resumenFicha(campos);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const alternar = (nombre: string) => {
    setAbiertas((actual) => {
      const copia = new Set(actual);
      if (copia.has(nombre)) copia.delete(nombre);
      else copia.add(nombre);
      return copia;
    });
  };

  const iniciarEdicion = (seccion: string, lista: FichaCampo[]) => {
    setBorrador(Object.fromEntries(lista.map((c) => [c.id, c.valor ?? ''])));
    setEditando(seccion);
    setAbiertas((actual) => new Set(actual).add(seccion));
  };

  const guardar = async (lista: FichaCampo[]) => {
    const cambios: CambioCampo[] = lista
      .filter((c) => (c.valor ?? '') !== (borrador[c.id] ?? '').trim())
      .map((c) => ({ campo: c, valor: borrador[c.id] ?? '' }));
    if (cambios.length === 0) {
      setEditando(null);
      return;
    }
    setGuardando(true);
    const ok = await ejecutar(() => guardarCamposFicha(ctx, escuela, cambios), 'Ficha guardada');
    setGuardando(false);
    if (ok) setEditando(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Ficha completa</p>
          <p className="text-3xl font-semibold text-slate-900">{resumen.pct}%</p>
        </div>
        {resumen.listaParaGoLive ? (
          <Pill tono="verde">Lista para go-live</Pill>
        ) : (
          <Pill tono="rojo">{resumen.criticosVacios} campos críticos vacíos</Pill>
        )}
      </div>
      <p className="text-xs text-slate-500">* = crítico para go-live</p>

      <div className="flex flex-col gap-3">
        {resumen.secciones.map((seccion) => {
          const abierta = abiertas.has(seccion.nombre);
          const enEdicion = editando === seccion.nombre;
          const grupos = agrupar(seccion.campos);
          return (
            <section key={seccion.nombre} className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-3 px-5 py-4">
                <button onClick={() => alternar(seccion.nombre)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${abierta ? 'rotate-180' : ''}`} />
                  <span className="truncate font-medium text-slate-900">
                    {seccion.nombre}
                    {seccion.critica ? '*' : ''}
                  </span>
                  <span className="shrink-0 text-sm text-slate-500">
                    {seccion.llenos} de {seccion.campos.length} · {seccion.pct}%
                  </span>
                </button>
                {enEdicion ? null : (
                  <Boton variante="fantasma" onClick={() => iniciarEdicion(seccion.nombre, seccion.campos)} className="px-2 py-1">
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Boton>
                )}
              </div>

              {abierta && (
                <div className="flex flex-col gap-5 border-t border-slate-100 px-5 py-5">
                  {grupos.map(([grupo, lista]) => (
                    <div key={grupo || 'sin-grupo'} className="flex flex-col gap-3">
                      {grupo && <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{grupo}</h3>}
                      {lista.map((c) => {
                        const vacio = !campoLleno(c);
                        return (
                          <div key={c.id} className="grid gap-1 sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
                            <span className="text-sm text-slate-700">
                              {c.campo}
                              {c.critico ? '*' : ''}
                            </span>
                            {enEdicion ? (
                              <input
                                value={borrador[c.id] ?? ''}
                                onChange={(e) => setBorrador((b) => ({ ...b, [c.id]: e.target.value }))}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
                              />
                            ) : vacio ? (
                              <span className={`text-sm ${c.critico ? 'font-medium text-rose-700' : 'text-slate-400'}`}>
                                {c.critico ? 'Falta completar' : 'Sin completar'}
                              </span>
                            ) : (
                              <span className="text-sm text-slate-900">{c.valor}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {enEdicion && (
                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                      <Boton onClick={() => setEditando(null)}>Cancelar</Boton>
                      <Boton variante="primario" disabled={guardando} onClick={() => guardar(seccion.campos)}>
                        Guardar
                      </Boton>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function agrupar(campos: FichaCampo[]): [string, FichaCampo[]][] {
  const mapa = new Map<string, FichaCampo[]>();
  for (const c of campos) {
    const clave = c.grupo ?? '';
    mapa.set(clave, [...(mapa.get(clave) ?? []), c]);
  }
  return [...mapa.entries()];
}
