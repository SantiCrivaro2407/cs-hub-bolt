import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { dominioPermitido } from '@/lib/domain/email';

interface AuthContextValue {
  session: Session | null;
  cargando: boolean;
  iniciarSesion: (email: string, password: string) => Promise<string | null>;
  /** Devuelve un error para mostrar, o null si la cuenta se creó y falta confirmar el email. */
  crearCuenta: (email: string, password: string, nombre: string) => Promise<string | null>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const MENSAJE_DOMINIO = 'Solo se pueden crear cuentas con un mail @volantisedu.com o @itba.edu.ar.';

function mensajeAuth(mensaje: string): string {
  const texto = mensaje.toLowerCase();
  if (texto.includes('dominio_no_permitido') || texto.includes('database error saving new user')) return MENSAJE_DOMINIO;
  if (texto.includes('email not confirmed')) return 'Todavía no confirmaste tu mail. Buscá el link que te mandamos (revisá también spam).';
  if (texto.includes('rate limit') || texto.includes('too many')) return 'Se mandaron demasiados mails seguidos. Probá de nuevo en unos minutos.';
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
      crearCuenta: async (email, password, nombre) => {
        if (!dominioPermitido(email)) return MENSAJE_DOMINIO;
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          // El link de confirmación vuelve a donde se creó la cuenta (local o la URL publicada).
          options: { data: { nombre: nombre.trim() }, emailRedirectTo: window.location.origin },
        });
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
