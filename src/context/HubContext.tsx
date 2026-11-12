import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { cargarHubData } from '@/lib/data/fetchHubData';
import { supabase } from '@/lib/supabase';
import { cargarDatosDemo } from '@/lib/demo/loadDemo';
import type { Avisos, ContextoAccion } from '@/lib/actions/base';
import type { Equipo, HubData } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface HubContextValue {
  datos: HubData;
  yo: Equipo;
  ctx: ContextoAccion;
  refrescar: () => Promise<void>;
  ejecutar: (accion: () => Promise<Avisos>, exito: string) => Promise<boolean>;
  reiniciarDemo: () => Promise<boolean>;
}

const HubContext = createContext<HubContextValue | null>(null);

export function HubProvider({ children }: { children: ReactNode }) {
  const { session, cerrarSesion } = useAuth();
  const { mostrar } = useToast();
  const [datos, setDatos] = useState<HubData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const email = session?.user.email?.toLowerCase() ?? '';
  const userId = session?.user.id ?? null;

  const refrescar = useCallback(async () => {
    try {
      setDatos(await cargarHubData());
      setError(null);
    } catch (e) {
      console.error(e);
      setError('No pudimos cargar los datos del backoffice.');
    }
  }, []);

  useEffect(() => {
    // Ata la fila del equipo a esta cuenta la primera vez que entra (ver reclamar_membresia en las migraciones).
    // Si la migración todavía no está aplicada, la RPC no existe y se sigue igual.
    supabase
      .rpc('reclamar_membresia')
      .then(({ error }) => error && console.warn(`reclamar_membresia: ${error.message}`))
      .then(refrescar);
  }, [refrescar]);

  // Misma regla que la base: primero la fila atada a esta cuenta, después una sin reclamar con este email.
  const yo =
    datos?.equipo.find((m) => userId !== null && m.user_id === userId) ??
    datos?.equipo.find((m) => !m.user_id && m.email.toLowerCase() === email) ??
    null;

  const ctx = useMemo<ContextoAccion | null>(() => (datos && yo ? { datos, yo } : null), [datos, yo]);

  const ejecutar = useCallback(
    async (accion: () => Promise<Avisos>, exito: string) => {
      try {
        const avisos = await accion();
        mostrar(exito);
        (avisos ?? []).forEach((aviso) => mostrar(aviso));
        await refrescar();
        return true;
      } catch (e) {
        console.error(e);
        mostrar(e instanceof Error && e.message.startsWith('Solo se puede') ? e.message : 'No se pudo guardar. Intentá de nuevo.', 'error');
        return false;
      }
    },
    [mostrar, refrescar],
  );

  const reiniciarDemo = useCallback(async () => {
    if (!datos) return false;
    try {
      await cargarDatosDemo(datos.equipo);
      await refrescar();
      mostrar('Demo reiniciada con los datos de ejemplo');
      return true;
    } catch (e) {
      console.error(e);
      mostrar('No se pudo reiniciar la demo. Intentá de nuevo.', 'error');
      return false;
    }
  }, [datos, mostrar, refrescar]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-700">{error}</p>
        <div className="flex gap-2">
          <button onClick={refrescar} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Reintentar
          </button>
          <button onClick={cerrarSesion} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (!datos || !ctx) {
    if (datos && !yo) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
          <p className="max-w-sm text-sm text-slate-700">Tu cuenta no está en el equipo de CS. Pedile a un owner que te agregue.</p>
          <button onClick={cerrarSesion} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
            Cerrar sesión
          </button>
        </div>
      );
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  const valor: HubContextValue = { datos, yo: ctx.yo, ctx, refrescar, ejecutar, reiniciarDemo };
  return <HubContext.Provider value={valor}>{children}</HubContext.Provider>;
}

export function useHub(): HubContextValue {
  const ctx = useContext(HubContext);
  if (!ctx) throw new Error('useHub debe usarse dentro de HubProvider');
  return ctx;
}
