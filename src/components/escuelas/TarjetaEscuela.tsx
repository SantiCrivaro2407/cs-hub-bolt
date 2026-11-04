import { useHub } from '@/context/HubContext';
import { Avatar, EtapaBadge, HealthChip, Pill } from '@/components/ui/Insignias';
import { Enlace } from '@/components/ui/Enlace';
import { cambiarOwnerEscuela } from '@/lib/actions/escuelas';
import { hacePlural, diasEntre } from '@/lib/domain/dates';
import type { ResumenEscuela } from '@/lib/domain/cartera';

export function TarjetaEscuela({ resumen }: { resumen: ResumenEscuela }) {
  const { datos, ctx, ejecutar } = useHub();
  const { escuela, health } = resumen;
  const ultimoContacto = escuela.ultimo_contacto ? diasEntre(escuela.ultimo_contacto) : null;

  return (
    <article className="group relative flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Avatar iniciales={escuela.iniciales} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Enlace href={`/escuelas/${escuela.slug}`} className="truncate text-base font-semibold text-slate-900 after:absolute after:inset-0 after:content-[''] hover:underline">
              {escuela.nombre}
            </Enlace>
            <EtapaBadge etapa={escuela.etapa} />
            {resumen.caida && <Pill tono="rojo">Caída de health</Pill>}
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            {escuela.slug} · {escuela.idioma}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <HealthChip total={health.total} delta={health.delta} />
            <span className="rounded-md bg-slate-100 px-2 py-1">Issues {resumen.issuesAbiertas}</span>
            <span className="rounded-md bg-slate-100 px-2 py-1">Loops {resumen.loopsAbiertos}</span>
            {resumen.loopsListos > 0 && <Pill tono="verde">{resumen.loopsListos} para responder</Pill>}
            {resumen.ticketsNuevos > 0 && <Pill tono="rojo">{resumen.ticketsNuevos} tickets nuevos</Pill>}
            {resumen.loopsVencidos + resumen.ticketsVencidos > 0 && <Pill tono="rojo">Vencido</Pill>}
          </div>
        </div>
      </div>
      <div className="relative z-10 flex flex-col items-start gap-2 text-sm text-slate-500 sm:items-end">
        <span>{ultimoContacto === null ? 'Sin contacto registrado' : `Último contacto ${hacePlural(ultimoContacto)}`}</span>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
          Owner
          <select
            value={escuela.owner_id ?? ''}
            onChange={(e) => ejecutar(() => cambiarOwnerEscuela(ctx, escuela, e.target.value), 'Owner actualizado')}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-900"
          >
            {datos.equipo.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>
    </article>
  );
}
