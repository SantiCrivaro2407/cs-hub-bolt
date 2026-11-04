import { useMemo, useState } from 'react';
import { TarjetaEscuela } from '@/components/escuelas/TarjetaEscuela';
import { BarraFiltros, FILTROS_VACIOS, type Filtros } from '@/components/escuelas/BarraFiltros';
import { useHub } from '@/context/HubContext';
import { ordenarCartera, resumenEscuela } from '@/lib/domain/cartera';
import { nivelHealth } from '@/lib/domain/health';

export function EscuelasPage() {
  const { datos, yo } = useHub();
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);

  const resumenes = useMemo(() => ordenarCartera(datos.escuelas.map((e) => resumenEscuela(datos, e))), [datos]);

  const visibles = resumenes.filter(({ escuela, health }) => {
    if (filtros.etapa && escuela.etapa !== filtros.etapa) return false;
    if (filtros.owner && escuela.owner_id !== filtros.owner) return false;
    if (filtros.soloMias && escuela.owner_id !== yo.id) return false;
    if (filtros.color !== 'todos') {
      if (health.total === null || nivelHealth(health.total) !== filtros.color) return false;
    }
    if (filtros.busqueda && !escuela.nombre.toLowerCase().includes(filtros.busqueda.trim().toLowerCase())) return false;
    return true;
  });

  return (
    // Ocupa todo el <main> (deshace su padding) para pintar el fondo de la página.
    <div className="relative -m-4 min-h-[calc(100vh-7rem)] bg-tutorial-getting-started/25 p-4 pb-32 sm:-m-6 sm:p-6 sm:pb-32 lg:-m-8 lg:min-h-screen lg:p-8 lg:pb-32">
      <div aria-hidden className="fondo-puntos pointer-events-none absolute inset-x-0 bottom-0 h-72" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-6">
        <h1 className="text-3xl">Escuelas</h1>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 min-[1360px]:grid-cols-4">
          {visibles.map((r) => (
            <TarjetaEscuela key={r.escuela.id} resumen={r} />
          ))}
          {visibles.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No hay escuelas con esos filtros.
            </div>
          )}
        </div>
      </div>

      <BarraFiltros filtros={filtros} onCambiar={setFiltros} equipo={datos.equipo} ocultas={resumenes.length - visibles.length} />
    </div>
  );
}
