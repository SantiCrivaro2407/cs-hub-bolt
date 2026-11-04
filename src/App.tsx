import { AuthProvider, useAuth } from '@/context/AuthContext';
import { HubProvider } from '@/context/HubContext';
import { ToastProvider } from '@/context/ToastContext';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/pages/LoginPage';
import { EscuelasPage } from '@/pages/EscuelasPage';
import { EscuelaPage } from '@/pages/EscuelaPage';
import { TicketsPage } from '@/pages/TicketsPage';
import { LoopsPage } from '@/pages/LoopsPage';
import { useRuta } from '@/lib/router';

function Rutas() {
  const { path } = useRuta();
  const coincidencia = /^\/escuelas\/([^/]+)$/.exec(path);
  if (path === '/') return <EscuelasPage />;
  if (coincidencia) return <EscuelaPage slug={decodeURIComponent(coincidencia[1])} />;
  if (path === '/tickets') return <TicketsPage />;
  if (path === '/loops') return <LoopsPage />;
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-slate-600">No encontramos esa página.</p>
    </div>
  );
}

function ContenidoAutenticado() {
  return (
    <HubProvider>
      <AppShell>
        <Rutas />
      </AppShell>
    </HubProvider>
  );
}

function Puerta() {
  const { session, cargando } = useAuth();
  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      </div>
    );
  }
  if (!session) return <LoginPage />;
  return <ContenidoAutenticado />;
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Puerta />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
