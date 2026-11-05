import { LoopsAgrupados, type GrupoLoop } from '@/components/loops/LoopsAgrupados';
import { useHub } from '@/context/HubContext';
import { navegar, urlConParams, useRuta } from '@/lib/router';
import { etiquetaMiembro } from '@/lib/domain/cartera';

const campo =
  'h-9 cursor-pointer rounded-md border border-input bg-background px-2.5 text-sm shadow-xs outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50';

const NOMBRE_GRUPO: Record<GrupoLoop, string> = {
  responder: 'los loops para responder',
  vencidos: 'los loops vencidos',
  curso: 'los loops en curso',
};

export function LoopsPage() {
  const { datos, yo } = useHub();
  const { params } = useRuta();
  const escuela = params.get('escuela');
  const owner = params.get('owner');
  const soloMios = params.get('mios') === '1';
  // Compatibles con los links de la home y de la barra lateral.
  const soloGrupo: GrupoLoop | null =
    params.get('vencido') === '1' ? 'vencidos' : params.get('estado') === 'Ready to reply' ? 'responder' : null;

  const cambiar = (cambios: Record<string, string | null>) => navegar(urlConParams('/loops', cambios, params));

  const visibles = datos.loops
    .filter((l) => (escuela ? l.escuela_id === escuela : true))
    .filter((l) => (owner ? l.owner_id === owner : true))
    .filter((l) => (soloMios ? l.owner_id === yo.id : true));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <h1 className="text-2xl">Loops</h1>
        <p className="mt-1 text-sm text-muted-foreground">Lo que las escuelas esperan de nosotros, agrupado por lo que hay que hacer.</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <select value={escuela ?? ''} onChange={(e) => cambiar({ escuela: e.target.value || null })} className={campo} aria-label="Filtrar por escuela">
          <option value="">Todas las escuelas</option>
          {datos.escuelas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
        <select value={owner ?? ''} onChange={(e) => cambiar({ owner: e.target.value || null })} className={campo} aria-label="Filtrar por owner">
          <option value="">Todos los owners</option>
          {datos.equipo.map((m) => (
            <option key={m.id} value={m.id}>
              {etiquetaMiembro(datos.equipo, m)}
            </option>
          ))}
        </select>
        <label className={`${campo} flex items-center gap-2`}>
          <input type="checkbox" checked={soloMios} onChange={(e) => cambiar({ mios: e.target.checked ? '1' : null })} className="accent-foreground" />
          Solo míos
        </label>
      </div>

      {soloGrupo && (
        <p className="text-sm text-muted-foreground">
          Mostrando solo {NOMBRE_GRUPO[soloGrupo]}.{' '}
          <button onClick={() => cambiar({ vencido: null, estado: null })} className="font-medium text-foreground underline underline-offset-4">
            Ver todos
          </button>
        </p>
      )}

      <LoopsAgrupados loops={visibles} soloGrupo={soloGrupo} />
    </div>
  );
}
