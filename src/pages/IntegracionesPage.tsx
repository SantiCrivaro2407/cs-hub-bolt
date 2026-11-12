import { useEffect, useState, type ReactNode } from 'react';
import { CalendarDays, Check, Copy, GitBranch, Hash, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { Boton } from '@/components/ui/Boton';
import { Pill } from '@/components/ui/Insignias';
import { useHub } from '@/context/HubContext';
import { useToast } from '@/context/ToastContext';
import { conectarGmail, conectarReadAI, desconectar, miIntegracion, sincronizarGmail, urlWebhookReadAI } from '@/lib/actions/integraciones';
import { fechaHora } from '@/lib/domain/dates';
import { sincronizarLinear } from '@/lib/actions/linear';
import { supabase } from '@/lib/supabase';
import { navegar, useRuta } from '@/lib/router';
import type { Integracion, ProveedorIntegracion } from '@/lib/types';

const MOTIVOS_ERROR: Record<string, string> = {
  access_denied: 'No diste permiso en Google.',
  sin_refresh_token: 'Google no devolvió acceso permanente. Probá conectar de nuevo.',
  state_invalido: 'El link de conexión venció o ya se usó. Probá de nuevo.',
  cuenta_distinta: 'Elegiste otra cuenta de Google. Conectá el Gmail con el mismo email de tu usuario.',
};

function EstadoIntegracion({ integracion }: { integracion: Integracion | null }) {
  if (!integracion) return <Pill>No conectado</Pill>;
  if (integracion.estado === 'error') return <Pill tono="rojo">Revisar conexión</Pill>;
  return <Pill tono="verde">Conectado</Pill>;
}

function TarjetaIntegracion({
  icono,
  titulo,
  descripcion,
  integracion,
  children,
}: {
  icono: ReactNode;
  titulo: string;
  descripcion: string;
  integracion: Integracion | null;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">{icono}</div>
          <div>
            <h2 className="text-base">{titulo}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{descripcion}</p>
          </div>
        </div>
        <EstadoIntegracion integracion={integracion} />
      </div>
      {integracion && (
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {integracion.cuenta && (
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Cuenta</dt>
              <dd className="truncate font-medium">{integracion.cuenta}</dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="text-muted-foreground">{integracion.proveedor === 'gmail' ? 'Última sincronización' : 'Último reporte'}</dt>
            <dd className="font-medium">{integracion.ultima_sync ? fechaHora(integracion.ultima_sync) : 'Todavía no'}</dd>
          </div>
        </dl>
      )}
      {integracion?.estado === 'error' && integracion.ultimo_error && (
        <p className="rounded-lg bg-triage-support/50 px-3 py-2 text-sm text-triage-support-fg">{integracion.ultimo_error}</p>
      )}
      {children}
    </section>
  );
}

function CampoCopiable({ valor }: { valor: string }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    await navigator.clipboard.writeText(valor);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };
  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={valor}
        onFocus={(e) => e.target.select()}
        className="h-9 min-w-0 flex-1 rounded-md border border-input bg-muted/50 px-3 font-mono text-xs outline-none"
        aria-label="URL del webhook"
      />
      <Boton onClick={copiar} className="h-9 shrink-0">
        {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copiado ? 'Copiada' : 'Copiar'}
      </Boton>
    </div>
  );
}

function EstadoEquipo({ integraciones, proveedor, miembroId }: { integraciones: Integracion[]; proveedor: ProveedorIntegracion; miembroId: string }) {
  const integracion = integraciones.find((i) => i.equipo_id === miembroId && i.proveedor === proveedor && i.estado !== 'desconectada');
  if (!integracion) return <span className="text-muted-foreground/70">—</span>;
  return integracion.estado === 'error' ? (
    <span className="text-triage-support-fg">Error</span>
  ) : (
    <span className="text-triage-progressing-fg">{integracion.cuenta ?? 'Conectado'}</span>
  );
}

export function IntegracionesPage() {
  const { datos, ctx, ejecutar } = useHub();
  const { mostrar } = useToast();
  const { params } = useRuta();
  const [ocupado, setOcupado] = useState<string | null>(null);

  const gmail = miIntegracion(ctx, 'gmail');
  const readai = miIntegracion(ctx, 'readai');
  const contactos = datos.contactos.filter((c) => c.email);
  const escuelasConContactos = new Set(contactos.map((c) => c.escuela_id)).size;
  // Slack lo configura tecnología para todo el equipo: si hay tickets publicados, está andando.
  const publicadosEnSlack = datos.tickets.filter((t) => t.slack_url).sort((a, b) => b.creado.localeCompare(a.creado));

  // Vuelta del consentimiento de Google (?gmail=ok | error&detalle=...).
  const resultadoGmail = params.get('gmail');
  const detalleGmail = params.get('detalle');
  useEffect(() => {
    if (!resultadoGmail) return;
    if (resultadoGmail === 'ok') mostrar('Gmail conectado. La primera sincronización trae los últimos 12 meses.');
    else mostrar(MOTIVOS_ERROR[detalleGmail ?? ''] ?? 'No se pudo conectar Gmail.', 'error');
    navegar('/integraciones', { reemplazar: true });
  }, [resultadoGmail, detalleGmail, mostrar]);

  const conCarga = async (clave: string, accion: () => Promise<void>) => {
    setOcupado(clave);
    try {
      await accion();
    } finally {
      setOcupado(null);
    }
  };

  const iniciarGmail = () =>
    conCarga('gmail', async () => {
      try {
        await conectarGmail();
      } catch (e) {
        mostrar(e instanceof Error ? e.message : 'No se pudo conectar Gmail.', 'error');
      }
    });

  // Estado de la sincronización con Linear (para todo el equipo).
  const [linearSync, setLinearSync] = useState<{ ultima_sync: string | null; ultimo_error: string | null } | null>(null);
  const escuelasEnLinear = datos.escuelas.filter((e) => e.linear_alias).length;
  const enLinear = { loops: datos.loops.filter((l) => l.linear_uuid).length, issues: datos.issues.filter((i) => i.url).length };
  const leerLinearSync = () =>
    supabase
      .from('linear_sync')
      .select('ultima_sync, ultimo_error')
      .maybeSingle()
      .then(({ data }) => setLinearSync(data));
  useEffect(() => {
    void leerLinearSync();
  }, []);
  const sincronizarConLinear = () =>
    conCarga('linear', async () => {
      await ejecutar(async () => {
        const r = await sincronizarLinear();
        await leerLinearSync();
        return [`${r.revisadas} cambios revisados en Linear`];
      }, 'Linear sincronizado');
    });

  const sincronizar = () =>
    conCarga('sync', async () => {
      await ejecutar(async () => {
        const nuevas = await sincronizarGmail();
        return [nuevas === 0 ? 'No había emails nuevos con contactos' : `${nuevas} ${nuevas === 1 ? 'email nuevo registrado' : 'emails nuevos registrados'}`];
      }, 'Gmail sincronizado');
    });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl">Integraciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">Conectá tu mail y Read AI para que las interacciones con clientes se registren solas.</p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <p>
          Solo se registran intercambios con los <strong>{contactos.length} contactos con email</strong> cargados en el backoffice ({escuelasConContactos}{' '}
          {escuelasConContactos === 1 ? 'escuela' : 'escuelas'}). Cualquier otro email o reunión se ignora. Para sumar a alguien, agregalo como contacto
          en la ficha de su escuela.
        </p>
      </div>

      <TarjetaIntegracion
        icono={<Mail className="h-5 w-5" />}
        titulo="Gmail"
        descripcion="Registra los emails enviados y recibidos con contactos de clientes (la primera vez, los últimos 12 meses; después cada 15 minutos) y te deja responder desde el hub con tu casilla."
        integracion={gmail}
      >
        {gmail && gmail.estado !== 'error' && !gmail.config.envio && (
          <p className="text-sm text-triage-watch-fg">
            Falta el permiso para enviar: reconectá Gmail y aceptá "Enviar correo electrónico en tu nombre". Mientras tanto, las respuestas se registran en el
            hub pero no salen.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {(!gmail || gmail.estado === 'error' || !gmail.config.envio) && (
            <Boton variante="primario" onClick={iniciarGmail} disabled={ocupado === 'gmail'}>
              <Mail className="h-4 w-4" />
              {gmail ? 'Reconectar Gmail' : 'Conectar Gmail'}
            </Boton>
          )}
          {gmail && gmail.estado !== 'error' && (
            <Boton variante={gmail.config.envio ? 'primario' : 'secundario'} onClick={sincronizar} disabled={ocupado === 'sync'}>
              <RefreshCw className={`h-4 w-4 ${ocupado === 'sync' ? 'animate-spin' : ''}`} />
              Sincronizar ahora
            </Boton>
          )}
          {gmail && (
            <Boton variante="fantasma" onClick={() => ejecutar(() => desconectar(gmail), 'Gmail desconectado')}>
              Desconectar
            </Boton>
          )}
        </div>
      </TarjetaIntegracion>

      <TarjetaIntegracion
        icono={<CalendarDays className="h-5 w-5" />}
        titulo="Read AI"
        descripcion="Al terminar cada reunión, Read AI envía el resumen y los action items. Se registra como reunión si participa algún contacto."
        integracion={readai}
      >
        {readai?.config.token ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">En Read AI, agregá esta URL como webhook (sección de integraciones / webhooks). Es personal: no la compartas.</p>
            <CampoCopiable valor={urlWebhookReadAI(readai.config.token)} />
            <div className="flex flex-wrap gap-2">
              <Boton variante="fantasma" onClick={() => ejecutar(() => conectarReadAI(ctx), 'URL regenerada: actualizala en Read AI')}>
                Regenerar URL
              </Boton>
              <Boton variante="fantasma" onClick={() => ejecutar(() => desconectar(readai), 'Read AI desconectado')}>
                Desconectar
              </Boton>
            </div>
          </div>
        ) : (
          <div>
            <Boton variante="primario" onClick={() => ejecutar(() => conectarReadAI(ctx), 'URL de webhook lista')}>
              Generar URL de webhook
            </Boton>
          </div>
        )}
      </TarjetaIntegracion>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base">Linear</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Loops e issues son un espejo de Linear: lo que se crea o cambia en el hub va a Linear, y lo de Linear llega al hub al instante (webhook)
                o en la sincronización de cada 15 minutos. Un loop es una issue de CS con el label Loop; sus sub-issues son las issues ligadas.
              </p>
            </div>
          </div>
          {linearSync?.ultimo_error ? (
            <Pill tono="rojo">Revisar conexión</Pill>
          ) : linearSync?.ultima_sync ? (
            <Pill tono="verde">Sincronizado</Pill>
          ) : (
            <Pill>Sin sincronizar todavía</Pill>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {escuelasEnLinear} {escuelasEnLinear === 1 ? 'escuela conectada' : 'escuelas conectadas'} · {enLinear.loops} loops y {enLinear.issues} issues de
          Linear
          {linearSync?.ultima_sync && <> · última sincronización {fechaHora(linearSync.ultima_sync)}</>}
        </p>
        {linearSync?.ultimo_error && <p className="text-sm text-destructive">{linearSync.ultimo_error}</p>}
        <div>
          <Boton variante="secundario" onClick={sincronizarConLinear} disabled={ocupado === 'linear'}>
            <RefreshCw className={`h-4 w-4 ${ocupado === 'linear' ? 'animate-spin' : ''}`} aria-hidden />
            {ocupado === 'linear' ? 'Sincronizando…' : 'Sincronizar ahora'}
          </Boton>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
              <Hash className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base">Slack</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Cada ticket nuevo se publica en el canal del equipo con escuela, contacto y asunto. Las respuestas y cuando se resuelve van en el hilo
                del ticket. Es para todo el equipo; lo configura tecnología.
              </p>
            </div>
          </div>
          {publicadosEnSlack.length > 0 ? <Pill tono="verde">Activo</Pill> : <Pill>Sin avisos todavía</Pill>}
        </div>
        {publicadosEnSlack.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {publicadosEnSlack.length} {publicadosEnSlack.length === 1 ? 'ticket publicado' : 'tickets publicados'} · último{' '}
            {fechaHora(publicadosEnSlack[0].creado)}
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>Equipo</span>
          <span>Gmail</span>
          <span>Read AI</span>
        </div>
        <ul className="divide-y divide-border">
          {datos.equipo.map((m) => (
            <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 px-4 py-2.5 text-sm">
              <span className="truncate font-medium">{m.nombre}</span>
              <span className="truncate">
                <EstadoEquipo integraciones={datos.integraciones} proveedor="gmail" miembroId={m.id} />
              </span>
              <span className="truncate">
                <EstadoEquipo integraciones={datos.integraciones} proveedor="readai" miembroId={m.id} />
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
