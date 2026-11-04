import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  cargando: boolean;
  iniciarSesion: (email: string, password: string) => Promise<string | null>;
  crearCuenta: (email: string, password: string) => Promise<string | null>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mensajeAuth(mensaje: string): string {
  const texto = mensaje.toLowerCase();
  if (texto.includes('invalid login')) return 'Email o contraseña incorrectos.';
  if (texto.includes('already registered')) return 'Ya existe una cuenta con ese email.';
  if (texto.includes('password')) return 'La contraseña debe tener al menos 6 caracteres.';
  return 'No se pudo completar la operación. Intentá de nuevo.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCargando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => {
      setSession(nueva);
      setCargando(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const valor = useMemo<AuthContextValue>(
    () => ({
      session,
      cargando,
      iniciarSesion: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? mensajeAuth(error.message) : null;
      },
      crearCuenta: async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password });
        return error ? mensajeAuth(error.message) : null;
      },
      cerrarSesion: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, cargando],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
