import { useMemo, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { InteraccionItem } from '@/components/escuela/InteraccionItem';
import { NuevaNotaModal } from '@/components/escuela/NuevaNotaModal';
import { Boton } from '@/components/ui/Boton';
import { EditorEmail } from '@/components/ui/EditorEmail';
import { Enlace } from '@/components/ui/Enlace';
import { EstadoLoopBadge } from '@/components/ui/Insignias';
import { useHub } from '@/context/HubContext';
import { enviarEmail } from '@/lib/actions/email';
import { simularSincronizacion } from '@/lib/actions/escuelas';
import { rutaEscuela } from '@/lib/domain/cartera';
import { claveMes, nombreMes } from '@/lib/domain/dates';
import { loopVencido, ordenarLoops } from '@/lib/domain/loops';
import type { Escuela, Interaccion, TipoInteraccion } from '@/lib/types';

interface FiltroInteraccion {
  clave: string;
  texto: string;
  tipos: TipoInteraccion[] | null;
}

const FILTROS: FiltroInteraccion[] = [
  { clave: 'todas', texto: 'Todas', tipos: null },
  { clave: 'emails', texto: 'Emails', tipos: ['email_recibido', 'email_enviado'] },
  { clave: 'reuniones', texto: 'Reuniones', tipos: ['reunion'] },
  { clave: 'tickets', texto: 'Tickets', tipos: ['ticket'] },
  { clave: 'notas', texto: 'Notas', tipos: ['nota'] },
  { clave: 'internos', texto: 'Registros internos', tipos: ['registro_interno'] },
];

function agruparPorMes(interacciones: Interaccion[]): [string, Interaccion[]][] {
  const grupos = new Map<string, Interaccion[]>();
  for (const interaccion of interacciones) {
    const clave = claveMes(interaccion.fecha);
    grupos.set(clave, [...(grupos.get(clave) ?? []), interaccion]);
  }
  return [...grupos.entries()];
}

export function InteraccionesTab({ escuela }: { escuela: Escuela }) {
  const { datos, ctx, ejecutar } = useHub();
  const [filtro, setFiltro] = useState('todas');
  const [sincronizando, setSincronizando] = useState(false);
  const [nota, setNota] = useState(false);
  const [nuevoEmail, setNuevoEmail] = useState(false);

  const contactosConEmail = datos.contactos.filter((c) => c.escuela_id === escuela.id && c.email);
  const interacciones = useMemo(
    () =>
      datos.interacciones
        .filter((i) => i.escuela_id === escuela.id)
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [datos.interacciones, escuela.id],
  );
  const loopsAbiertos = ordenarLoops(
    datos.loops.filter((l) => l.escuela_id === escuela.id && l.estado !== 'Closed'),
  );

  const tiposFiltro = FILTROS.find((f) => f.clave === filtro)?.tipos ?? null;
  const visibles = tiposFiltro ? interacciones.filter((i) => tiposFiltro.includes(i.tipo)) : interacciones;
  const grupos = agruparPorMes(visibles);

  const sincronizar = async () => {
    setSincronizando(true);
    await ejecutar(() => simularSincronizacion(ctx, escuela).then(() => undefined), 'Sincronización completada');
    setSincronizando(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden />
          <p className="text-sm text-sky-900">Emails y reuniones se sincronizan automáticamente (simulado).</p>
        </div>
        <Boton variante="secundario" onClick={sincronizar} disabled={sincronizando}>
          <RefreshCw className={`h-4 w-4 ${sincronizando ? 'animate-spin' : ''}`} aria-hidden />
          Sincronizar ahora
        </Boton>
      </div>

      <div className="flex flex-wrap gap-2">
        <Boton variante="primario" onClick={() => setNuevoEmail(true)}>
          Nuevo email
        </Boton>
        <Boton variante="secundario" onClick={() => setNota(true)}>
          Agregar nota
        </Boton>
      </div>

      {loopsAbiertos.length > 0 && (
        <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Loops abiertos</h2>
          <ul className="flex flex-col divide-y divide-slate-100">
            {loopsAbiertos.map((loop) => (
              <li key={loop.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <Enlace href={rutaEscuela(escuela, 'loops', { loop: loop.id })} className="text-sm text-slate-800 hover:underline">
                  {loop.titulo}
                </Enlace>
                <EstadoLoopBadge estado={loop.estado} vencido={loopVencido(loop)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar interacciones">
        {FILTROS.map((f) => {
          const cantidad = f.tipos ? interacciones.filter((i) => f.tipos?.includes(i.tipo)).length : interacciones.length;
          const activo = filtro === f.clave;
          return (
            <button
              key={f.clave}
              onClick={() => setFiltro(f.clave)}
              aria-pressed={activo}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                activo ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'
              }`}
            >
              {f.texto}
              <span className={activo ? 'text-slate-300' : 'text-slate-500'}>{cantidad}</span>
            </button>
          );
        })}
      </div>

      {grupos.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Todavía no hay interacciones con este filtro.
        </div>
      )}

      {grupos.map(([mes, items]) => (
        <section key={mes} className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{nombreMes(mes)}</h2>
          {items.map((interaccion) => (
            <InteraccionItem key={interaccion.id} interaccion={interaccion} escuela={escuela} />
          ))}
        </section>
      ))}

      {nota && <NuevaNotaModal escuela={escuela} onCerrar={() => setNota(false)} />}
      {nuevoEmail && (
        <EditorEmail
          titulo="Nuevo email"
          inicial={{ asunto: '', para: contactosConEmail.map((c) => c.email as string), cuerpo: '' }}
          paraEditable
          textoBoton="Enviar email"
          onEnviar={(envio) => ejecutar(() => enviarEmail(ctx, escuela, envio), 'Email enviado')}
          onCerrar={() => setNuevoEmail(false)}
        />
      )}
    </div>
  );
}
