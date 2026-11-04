import { EncabezadoEscuela } from '@/components/escuela/EncabezadoEscuela';
import { FichaTab } from '@/components/escuela/FichaTab';
import { HealthTab } from '@/components/escuela/HealthTab';
import { InteraccionesTab } from '@/components/escuela/InteraccionesTab';
import { IssuesTab } from '@/components/escuela/IssuesTab';
import { LoopsTab } from '@/components/escuela/LoopsTab';
import { TicketsPanel } from '@/components/tickets/TicketsPanel';
import { useHub } from '@/context/HubContext';
import { issueResuelta } from '@/lib/domain/loops';
import { urlConParams, useRuta } from '@/lib/router';
import { Enlace } from '@/components/ui/Enlace';

const PESTANAS = ['ficha', 'health', 'interacciones', 'tickets', 'issues', 'loops'] as const;
type Pestana = (typeof PESTANAS)[number];

export function EscuelaPage({ slug }: { slug: string }) {
  const { datos } = useHub();
  const { params } = useRuta();
  const escuela = datos.escuelas.find((e) => e.slug === slug);

  if (!escuela) {
    return (
      <div className="py-16 text-center text-sm text-slate-600">
        No encontramos esa escuela. <Enlace href="/" className="font-medium text-slate-900 underline">Volver a Escuelas</Enlace>
      </div>
    );
  }

  const pestanaParam = params.get('tab') as Pestana | null;
  const pestana: Pestana = pestanaParam && PESTANAS.includes(pestanaParam) ? pestanaParam : 'ficha';

  const tickets = datos.tickets.filter((t) => t.escuela_id === escuela.id && t.estado !== 'Resuelto').length;
  const issues = datos.issues.filter((i) => i.escuela_id === escuela.id && !issueResuelta(i)).length;
  const loops = datos.loops.filter((l) => l.escuela_id === escuela.id && l.estado !== 'Closed').length;

  const etiquetas: { clave: Pestana; texto: string; contador?: number }[] = [
    { clave: 'ficha', texto: 'Ficha' },
    { clave: 'health', texto: 'Health' },
    { clave: 'interacciones', texto: 'Interacciones' },
    { clave: 'tickets', texto: 'Tickets', contador: tickets },
    { clave: 'issues', texto: 'Issues', contador: issues },
    { clave: 'loops', texto: 'Loops', contador: loops },
  ];

  return (
    <div className="flex flex-col gap-8">
      <EncabezadoEscuela escuela={escuela} />

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Secciones de la escuela">
          {etiquetas.map((e) => (
            <Enlace
              key={e.clave}
              href={urlConParams(`/escuelas/${escuela.slug}`, { tab: e.clave, loop: null }, new URLSearchParams())}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                pestana === e.clave ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {e.texto}
              {e.contador !== undefined && (
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{e.contador}</span>
              )}
            </Enlace>
          ))}
        </nav>
      </div>

      {pestana === 'ficha' && <FichaTab escuela={escuela} />}
      {pestana === 'health' && <HealthTab escuela={escuela} />}
      {pestana === 'interacciones' && <InteraccionesTab escuela={escuela} />}
      {pestana === 'tickets' && <TicketsPanel escuelaId={escuela.id} />}
      {pestana === 'issues' && <IssuesTab escuela={escuela} />}
      {pestana === 'loops' && <LoopsTab escuela={escuela} />}
    </div>
  );
}
