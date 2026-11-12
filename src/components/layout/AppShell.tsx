import { useState, type ReactNode } from 'react';
import { HeartPulse, Inbox, LogOut, Plug, Repeat, RotateCcw, School, Ticket } from 'lucide-react';
import { BuscadorGlobal } from '@/components/layout/BuscadorGlobal';
import { Boton } from '@/components/ui/Boton';
import { Enlace } from '@/components/ui/Enlace';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { useHub } from '@/context/HubContext';
import { useRuta } from '@/lib/router';
import { urgentesDe } from '@/pages/MisPendientesPage';

function Contador({ cantidad, titulo, tono }: { cantidad: number; titulo: string; tono: 'verde' | 'rojo' }) {
  if (cantidad === 0) return null;
  const clases = tono === 'verde' ? 'bg-triage-progressing text-triage-progressing-fg' : 'bg-triage-support text-triage-support-fg';
  return (
    <span title={titulo} className={`ml-auto rounded-full px-1.5 text-xs font-medium tabular-nums ${clases}`}>
      {cantidad}
    </span>
  );
}

function Logo() {
  return (
    <Enlace href="/" className="flex items-center gap-2 px-2 py-1">
      <img src="/logo-wordmark.png" alt="Volantis" width={110} height={48} className="h-auto w-[110px]" />
    </Enlace>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { datos, yo, reiniciarDemo } = useHub();
  const { cerrarSesion } = useAuth();
  const { path } = useRuta();
  const [confirmarReinicio, setConfirmarReinicio] = useState(false);
  const [reiniciando, setReiniciando] = useState(false);

  const ticketsNuevos = datos.tickets.filter((t) => t.estado === 'Nuevo').length;
  const loopsListos = datos.loops.filter((l) => l.estado === 'Ready to reply').length;

  const misUrgentes = urgentesDe(datos, yo);

  const enlaces = [
    {
      href: '/pendientes',
      label: 'Mis pendientes',
      Icono: Inbox,
      activo: path === '/pendientes',
      contador: <Contador cantidad={misUrgentes} titulo={`${misUrgentes} pendientes tuyos para atender ya`} tono="rojo" />,
    },
    { href: '/', label: 'Escuelas', Icono: School, activo: path === '/' || path.startsWith('/escuelas'), contador: null },
    { href: '/health', label: 'Health', Icono: HeartPulse, activo: path === '/health', contador: null },
    {
      href: '/tickets',
      label: 'Tickets',
      Icono: Ticket,
      activo: path === '/tickets',
      contador: <Contador cantidad={ticketsNuevos} titulo={`${ticketsNuevos} tickets nuevos`} tono="rojo" />,
    },
    {
      href: '/loops',
      label: 'Loops',
      Icono: Repeat,
      activo: path === '/loops',
      contador: <Contador cantidad={loopsListos} titulo={`${loopsListos} loops listos para responder`} tono="verde" />,
    },
    { href: '/integraciones', label: 'Integraciones', Icono: Plug, activo: path === '/integraciones', contador: null },
  ];

  const confirmarDemo = async () => {
    setReiniciando(true);
    await reiniciarDemo();
    setReiniciando(false);
    setConfirmarReinicio(false);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <Logo />
        <div className="mt-1 px-2 text-xs font-medium uppercase tracking-caps text-muted-foreground">CS Hub</div>
        <div className="mt-5">
          <BuscadorGlobal />
        </div>
        <nav className="mt-4 flex flex-col gap-1">
          {enlaces.map(({ href, label, Icono, activo, contador }) => (
            <Enlace
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent ${activo ? 'bg-sidebar-accent font-medium' : ''}`}
            >
              <Icono className="h-5 w-5" />
              {label}
              {contador}
            </Enlace>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t border-sidebar-border pt-4 text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-2">
            <span>
              Sesión: <span className="font-medium text-foreground">{yo.nombre}</span>
            </span>
            <button onClick={cerrarSesion} className="rounded-md p-1.5 hover:bg-sidebar-accent hover:text-foreground" aria-label="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <div>Datos de ejemplo · integraciones simuladas</div>
          <Boton onClick={() => setConfirmarReinicio(true)} className="h-8 px-2.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
            Reiniciar demo
          </Boton>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex flex-col gap-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Logo />
            <div className="flex items-center gap-1">
              <button onClick={() => setConfirmarReinicio(true)} className="rounded-md p-2 text-muted-foreground hover:bg-accent" aria-label="Reiniciar demo">
                <RotateCcw className="h-4 w-4" />
              </button>
              <button onClick={cerrarSesion} className="rounded-md p-2 text-muted-foreground hover:bg-accent" aria-label="Cerrar sesión">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          <nav className="-mx-4 flex items-center gap-1 overflow-x-auto px-4">
            {enlaces.map(({ href, label, Icono, activo }) => (
              <Enlace
                key={href}
                href={href}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm hover:bg-accent ${activo ? 'bg-accent font-medium' : ''}`}
              >
                <Icono className="h-4 w-4" />
                {label}
              </Enlace>
            ))}
          </nav>
          <BuscadorGlobal />
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {confirmarReinicio && (
        <Modal titulo="¿Reiniciar la demo?" onCerrar={() => setConfirmarReinicio(false)}>
          <p className="text-sm text-muted-foreground">Se vuelven a cargar las escuelas de ejemplo (Aleph, Casa Amarilla, Curriculum for Wales y CCB) y se pierden los cambios que hiciste en ellas. Los clientes reales no se tocan.</p>
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
