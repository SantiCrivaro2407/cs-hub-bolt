import { useState, type FormEvent } from 'react';
import { MailCheck } from 'lucide-react';
import { Boton } from '@/components/ui/Boton';
import { useAuth } from '@/context/AuthContext';
import { dominioPermitido } from '@/lib/domain/email';

const campo =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200';

export function LoginPage() {
  const { iniciarSesion, crearCuenta } = useAuth();
  const [modo, setModo] = useState<'entrar' | 'crear'>('entrar');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmar, setConfirmar] = useState<string | null>(null);

  const dominioMal = modo === 'crear' && email.includes('@') && email.split('@')[1].includes('.') && !dominioPermitido(email);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (dominioMal) return;
    setEnviando(true);
    setError(null);
    const resultado = modo === 'entrar' ? await iniciarSesion(email, password) : await crearCuenta(email, password, nombre);
    setEnviando(false);
    if (resultado) setError(resultado);
    else if (modo === 'crear') setConfirmar(email.trim());
  };

  const cambiarModo = () => {
    setModo(modo === 'entrar' ? 'crear' : 'entrar');
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">CS Hub · Volantis</p>

        {confirmar ? (
          <div className="mt-6 flex flex-col gap-4" role="status">
            <MailCheck className="h-8 w-8 text-slate-700" aria-hidden />
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Revisá tu mail</h1>
            <p className="text-sm leading-relaxed text-slate-600">
              Te mandamos un link a <span className="font-medium text-slate-900">{confirmar}</span> para confirmar la cuenta. Después de tocarlo,
              entrás directo al CS Hub. Si no llega en unos minutos, revisá spam.
            </p>
            <Boton
              variante="secundario"
              onClick={() => {
                setConfirmar(null);
                setModo('entrar');
                setPassword('');
              }}
            >
              Ya confirmé, iniciar sesión
            </Boton>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{modo === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {modo === 'entrar' ? 'Backoffice interno de Customer Success.' : 'Con tu mail @volantisedu.com o @itba.edu.ar.'}
              </p>
            </div>
            <form onSubmit={enviar} className="flex flex-col gap-4">
              {modo === 'crear' && (
                <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                  Nombre
                  <input required maxLength={80} autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} />
                </label>
              )}
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={dominioMal}
                  aria-describedby={dominioMal ? 'aviso-dominio' : undefined}
                  className={campo}
                />
                {dominioMal && (
                  <span id="aviso-dominio" className="text-xs font-normal text-red-700">
                    Solo se aceptan mails @volantisedu.com o @itba.edu.ar.
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Contraseña
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={campo}
                />
              </label>
              {error && (
                <p role="alert" className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  {error}
                </p>
              )}
              <Boton type="submit" variante="primario" disabled={enviando || dominioMal} className="w-full py-2.5">
                {enviando ? 'Procesando…' : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
              </Boton>
            </form>
            <button onClick={cambiarModo} className="mt-4 w-full text-center text-sm text-slate-600 hover:text-slate-900">
              {modo === 'entrar' ? '¿No tenés cuenta? Crear una' : 'Ya tengo cuenta'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
