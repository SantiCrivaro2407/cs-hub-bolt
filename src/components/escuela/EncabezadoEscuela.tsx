import { useHub } from '@/context/HubContext';
import { Avatar, HealthChip } from '@/components/ui/Insignias';
import { Enlace } from '@/components/ui/Enlace';
import { cambiarEtapaEscuela, cambiarOwnerEscuela } from '@/lib/actions/escuelas';
import { resumenHealth } from '@/lib/domain/health';
import type { Escuela, Etapa } from '@/lib/types';
import { etiquetaMiembro } from '@/lib/domain/cartera';

const ETAPAS: Etapa[] = ['Piloto', 'Onboarding', 'Live', 'Renovación'];

export function EncabezadoEscuela({ escuela }: { escuela: Escuela }) {
  const { datos, ctx, ejecutar } = useHub();
  const health = resumenHealth(datos.snapshots.filter((s) => s.escuela_id === escuela.id));
  const campo = 'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-900';

  return (
    <header className="flex flex-col gap-5">
      <nav className="text-sm text-slate-500">
        <Enlace href="/" className="hover:text-slate-900">
          Escuelas
        </Enlace>
        <span className="mx-2">/</span>
        <span className="text-slate-800">{escuela.nombre}</span>
      </nav>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Avatar iniciales={escuela.iniciales} tamano="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{escuela.nombre}</h1>
              <HealthChip total={health.total} delta={health.delta} conEtiqueta />
              {health.caida && <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">Caída de health</span>}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {escuela.slug} · {escuela.idioma} · {escuela.etapa}
              {escuela.sedes ? ` · ${escuela.sedes}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            Etapa
            <select
              value={escuela.etapa}
              onChange={(e) => ejecutar(() => cambiarEtapaEscuela(ctx, escuela, e.target.value as Etapa), 'Etapa actualizada')}
              className={campo}
            >
              {ETAPAS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            Owner
            <select
              value={escuela.owner_id ?? ''}
              onChange={(e) => ejecutar(() => cambiarOwnerEscuela(ctx, escuela, e.target.value), 'Owner actualizado')}
              className={campo}
            >
              {datos.equipo.map((m) => (
                <option key={m.id} value={m.id}>
                  {etiquetaMiembro(datos.equipo, m)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </header>
  );
}
