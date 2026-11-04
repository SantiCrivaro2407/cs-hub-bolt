import { useState, type FormEvent } from 'react';
import { Boton } from '@/components/ui/Boton';
import { useAuth } from '@/context/AuthContext';

export function LoginPage() {
  const { iniciarSesion, crearCuenta } = useAuth();
  const [modo, setModo] = useState<'entrar' | 'crear'>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const resultado = modo === 'entrar' ? await iniciarSesion(email, password) : await crearCuenta(email, password);
    setEnviando(false);
    if (resultado) setError(resultado);
    else if (modo === 'crear') setError('Cuenta creada. Si no entrás, avisá a un owner para que te agregue al equipo.');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-semibold text-slate-900">CS Hub · Volantis</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{modo === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>
          <p className="mt-1 text-sm text-slate-500">Backoffice interno de Customer Success.</p>
        </div>
        <form onSubmit={enviar} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Contraseña
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </label>
          {error && <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{error}</p>}
          <Boton type="submit" variante="primario" disabled={enviando} className="w-full py-2.5">
            {enviando ? 'Procesando…' : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
          </Boton>
        </form>
        <button
          onClick={() => {
            setModo(modo === 'entrar' ? 'crear' : 'entrar');
            setError(null);
          }}
          className="mt-4 w-full text-center text-sm text-slate-600 hover:text-slate-900"
        >
          {modo === 'entrar' ? '¿No tenés cuenta? Crear una' : 'Ya tengo cuenta'}
        </button>
      </div>
    </div>
  );
}
