import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, type LucideIcon } from 'lucide-react';
import { Enlace } from '@/components/ui/Enlace';
import { useHub } from '@/context/HubContext';
import { nombreEquipo, rutaEscuela } from '@/lib/domain/cartera';
import { diasEntre, diasHabilesEntre, hacePlural } from '@/lib/domain/dates';
import { contarResueltas, loopVencido } from '@/lib/domain/loops';
import type { Loop } from '@/lib/types';

export type GrupoLoop = 'responder' | 'vencidos' | 'curso';

/** En qué grupo cae un loop: lo que ya se puede contestar, lo fuera de plazo (RN7) o lo que sigue en curso. */
export function grupoDeLoop(loop: Loop, ahora = new Date()): GrupoLoop | 'cerrado' {
  if (loop.estado === 'Closed') return 'cerrado';
  if (loop.estado === 'Ready to reply') return 'responder';
  if (loopVencido(loop, ahora)) return 'vencidos';
  return 'curso';
}

const GRUPOS: { clave: GrupoLoop; titulo: string; descripcion: string; Icono: LucideIcon; tono: string }[] = [
  {
    clave: 'responder',
    titulo: 'Para responder',
    descripcion: 'Todas sus issues están resueltas: ya se le puede contestar a la escuela.',
    Icono: CheckCircle2,
    tono: 'text-triage-progressing-fg',
  },
  {
    clave: 'vencidos',
    titulo: 'Vencidos',
    descripcion: 'Más de 5 días hábiles sin respuesta. Del más viejo al más nuevo.',
    Icono: AlertTriangle,
    tono: 'text-triage-support-fg',
  },
  {
    clave: 'curso',
    titulo: 'En curso',
    descripcion: 'Dentro del plazo, esperando que se resuelvan sus issues.',
    Icono: Clock,
    tono: 'text-muted-foreground',
  },
];

interface Props {
  loops: Loop[];
  /** Muestra un solo grupo (por ejemplo al llegar desde la home con ?vencido=1). */
  soloGrupo?: GrupoLoop | null;
  mostrarEscuela?: boolean;
  mostrarOwner?: boolean;
  vacio?: string;
}

export function LoopsAgrupados({ loops, soloGrupo = null, mostrarEscuela = true, mostrarOwner = true, vacio = 'No hay loops con esos filtros.' }: Props) {
  const { datos } = useHub();
  const [verCerrados, setVerCerrados] = useState(false);
  const ahora = new Date();

  const porGrupo = (clave: GrupoLoop) =>
    loops
      .filter((l) => grupoDeLoop(l, ahora) === clave)
      // Lo que más espera, primero.
      .sort((a, b) => a.creado.localeCompare(b.creado));
  const cerrados = loops.filter((l) => l.estado === 'Closed').sort((a, b) => (b.cerrado ?? '').localeCompare(a.cerrado ?? ''));

  const grupos = GRUPOS.filter((g) => !soloGrupo || g.clave === soloGrupo)
    .map((g) => ({ ...g, loops: porGrupo(g.clave) }))
    .filter((g) => g.loops.length > 0);

  if (grupos.length === 0 && (soloGrupo || cerrados.length === 0)) {
    return <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">{vacio}</div>;
  }

  const Fila = ({ loop }: { loop: Loop }) => {
    const escuela = datos.escuelas.find((e) => e.id === loop.escuela_id);
    const espera = datos.contactos.find((c) => c.id === loop.quien_espera)?.nombre;
    const ligadas = datos.issues.filter((i) => i.loop_id === loop.id);
    const grupo = grupoDeLoop(loop, ahora);
    const antiguedad =
      grupo === 'vencidos'
        ? `Hace ${diasHabilesEntre(loop.creado, ahora)} días hábiles`
        : grupo === 'cerrado' && loop.cerrado
          ? `Cerrado ${hacePlural(diasEntre(loop.cerrado, ahora))}`
          : hacePlural(diasEntre(loop.creado, ahora)).replace(/^h/, 'H');
    const estadoIssues =
      ligadas.length === 0
        ? 'sin issues ligadas'
        : ligadas.length === 1
          ? `issue ${contarResueltas(ligadas) === 1 ? 'resuelta' : 'sin resolver'}`
          : `${contarResueltas(ligadas)} de ${ligadas.length} issues resueltas`;

    const contenido = (
      <>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium group-hover:underline">{loop.titulo}</div>
          <div className="mt-0.5 truncate text-sm text-muted-foreground">
            {[mostrarEscuela ? escuela?.nombre : null, espera ? `espera ${espera}` : null, estadoIssues].filter(Boolean).join(', ')}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
          <span className={`whitespace-nowrap text-sm tabular-nums ${grupo === 'vencidos' ? 'font-medium text-triage-support-fg' : 'text-muted-foreground'}`}>{antiguedad}</span>
          {mostrarOwner && <span className="text-xs text-muted-foreground">{nombreEquipo(datos, loop.owner_id)}</span>}
        </div>
      </>
    );

    return (
      <li>
        {escuela ? (
          <Enlace href={rutaEscuela(escuela, 'loops', { loop: loop.id })} className="group flex items-center gap-4 px-4 py-3 hover:bg-accent/50">
            {contenido}
          </Enlace>
        ) : (
          <div className="flex items-center gap-4 px-4 py-3">{contenido}</div>
        )}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      {grupos.map((g) => (
        <section key={g.clave} aria-labelledby={`grupo-loops-${g.clave}`}>
          <div className="mb-3">
            <h2 id={`grupo-loops-${g.clave}`} className={`flex items-center gap-2 text-base ${g.tono}`}>
              <g.Icono className="h-4 w-4" aria-hidden />
              {g.titulo}
              <span className="font-normal tabular-nums text-muted-foreground">{g.loops.length}</span>
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{g.descripcion}</p>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {g.loops.map((l) => (
              <Fila key={l.id} loop={l} />
            ))}
          </ul>
        </section>
      ))}

      {!soloGrupo && cerrados.length > 0 && (
        <section>
          <button onClick={() => setVerCerrados((v) => !v)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground" aria-expanded={verCerrados}>
            <ChevronDown className={`h-4 w-4 transition-transform ${verCerrados ? '' : '-rotate-90'}`} aria-hidden />
            Cerrados <span className="tabular-nums">{cerrados.length}</span>
          </button>
          {verCerrados && (
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card opacity-80">
              {cerrados.map((l) => (
                <Fila key={l.id} loop={l} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
