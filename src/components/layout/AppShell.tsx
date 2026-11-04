import { useState, type ReactNode } from 'react';
import { RotateCcw, LogOut } from 'lucide-react';
import { BuscadorGlobal } from '@/components/layout/BuscadorGlobal';
import { Boton } from '@/components/ui/Boton';
import { Enlace } from '@/components/ui/Enlace';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { useHub } from '@/context/HubContext';
import { useRuta } from '@/lib/router';

function Badge({ cantidad }: { cantidad: number }) {
  if (cantidad === 0) return null;
  return <span className="ml-1.5 rounded-full bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">{cantidad}</span>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { datos, yo, reiniciarDemo } = useHub();
  const { cerrarSesion } = useAuth();
  const { path } = useRuta();
  const [confirmarReinicio, setConfirmarReinicio] = useState(false);
  const [reiniciando, setReiniciando] = useState(false);

  const ticketsNuevos = datos.tickets.filter((t) => t.estado === 'Nuevo').length;
  const loopsListos = datos.loops.filter((l) => l.estado === 'Ready to reply').length;

  const enlaces = [
    { href: '/', label: 'Escuelas', activo: path === '/' || path.startsWith('/escuelas'), badge: 0 },
    { href: '/tickets', label: 'Tickets', activo: path === '/tickets', badge: ticketsNuevos },
    { href: '/loops', label: 'Loops', activo: path === '/loops', badge: loopsListos },
  ];

  const confirmarDemo = async () => {
    setReiniciando(true);
    await reiniciarDemo();
    setReiniciando(false);
    setConfirmarReinicio(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 lg:px-8">
          <Enlace href="/" className="text-sm font-semibold text-slate-900">
            CS Hub <span className="font-normal text-slate-500">· Volantis</span>
          </Enlace>
          <nav className="flex items-center gap-1">
            {enlaces.map((e) => (
              <Enlace
                key={e.href}
                href={e.href}
                className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  e.activo ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {e.label}
                <Badge cantidad={e.badge} />
              </Enlace>
            ))}
          </nav>
          <div className="ml-auto flex w-full items-center gap-3 sm:w-auto">
            <span className="hidden text-sm text-slate-600 xl:inline">Sesión: {yo.nombre}</span>
            <BuscadorGlobal />
            <Boton onClick={() => setConfirmarReinicio(true)} className="px-3 py-2">
              <RotateCcw className="h-4 w-4" />
              <span className="hidden md:inline">Reiniciar demo</span>
            </Boton>
            <button onClick={cerrarSesion} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-100/70 px-4 py-1.5 text-center text-xs text-slate-600">
          Datos de ejemplo · las integraciones (Gmail, Google Calendar, Read AI, Linear, Slack, plataforma) están simuladas
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">{children}</main>

      {confirmarReinicio && (
        <Modal titulo="¿Reiniciar la demo?" onCerrar={() => setConfirmarReinicio(false)}>
          <p className="text-sm text-slate-600">Se van a volver a cargar los datos de ejemplo. Los cambios que hiciste se pierden.</p>
          <div className="mt-6 flex justify-end gap-2">
            <Boton onClick={() => setConfirmarReinicio(false)}>Cancelar</Boton>
            <Boton variante="peligro" onClick={confirmarDemo} disabled={reiniciando}>
              {reiniciando ? 'Reiniciando…' : 'Reiniciar demo'}
            </Boton>
          </div>
        </Modal>
      )}
    </div>
  );
}
