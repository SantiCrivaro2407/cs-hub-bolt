import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { Boton } from '@/components/ui/Boton';
import { PanelLateral } from '@/components/ui/PanelLateral';
import { useHub } from '@/context/HubContext';
import { escuelaEnLinear, proponerLoop, type SubIssuePropuesta } from '@/lib/actions/linear';
import { crearLoop, type NuevoLoopInput } from '@/lib/actions/loops';
import { etiquetaMiembro } from '@/lib/domain/cartera';
import type { EquipoIssue, Escuela, OrigenLoop } from '@/lib/types';

const EQUIPOS: EquipoIssue[] = ['CS', 'Tech', 'Product'];
const MAX_SUB_ISSUES = 15;
const campo = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900';

interface Props {
  escuela: Escuela;
  origen: OrigenLoop;
  origenInteraccionId?: string;
  ticketId?: string;
  tituloInicial?: string;
  actionItem?: { id: string; texto: string };
  onCerrar: () => void;
}

interface SubIssueEditable extends SubIssuePropuesta {
  clave: string;
}

const nuevaSub = (equipo: EquipoIssue = 'CS'): SubIssueEditable => ({ clave: crypto.randomUUID(), titulo: '', descripcion: '', equipo });

/**
 * Crear un loop desde un ticket, un email o una reunión: la IA propone el loop entero (con sus sub-issues por equipo)
 * a partir del texto de origen, el CS lo revisa y al crear se arma en Linear (issue padre + sub-issues).
 */
export function CrearLoopPanel({ escuela, origen, origenInteraccionId, ticketId, tituloInicial = '', actionItem, onCerrar }: Props) {
  const { datos, yo, ctx, ejecutar } = useHub();
  const contactos = datos.contactos.filter((c) => c.escuela_id === escuela.id);
  const conOrigen = !!(ticketId || origenInteraccionId);
  const enLinear = escuelaEnLinear(escuela);

  const [titulo, setTitulo] = useState(actionItem?.texto ?? tituloInicial);
  const [quePidio, setQuePidio] = useState('');
  const [quienEsperaId, setQuienEsperaId] = useState('');
  const [ownerId, setOwnerId] = useState(yo.id);
  const [subs, setSubs] = useState<SubIssueEditable[]>(conOrigen ? [] : [nuevaSub()]);
  const [proponiendo, setProponiendo] = useState(conOrigen);
  const [errorPropuesta, setErrorPropuesta] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const pedido = useRef(0);

  const proponer = useCallback(async () => {
    if (!conOrigen) return;
    const numero = ++pedido.current;
    setProponiendo(true);
    setErrorPropuesta(null);
    try {
      const p = await proponerLoop(escuela.id, { ticketId, interaccionId: ticketId ? undefined : origenInteraccionId, actionItem: actionItem?.texto });
      if (numero !== pedido.current) return;
      setTitulo(p.titulo);
      setQuePidio(p.que_pidio);
      setQuienEsperaId(p.quien_espera ?? '');
      setSubs(p.sub_issues.map((s) => ({ ...s, clave: crypto.randomUUID() })));
    } catch (e) {
      if (numero !== pedido.current) return;
      setErrorPropuesta(e instanceof Error ? e.message : 'No se pudo armar la propuesta.');
      setSubs((actuales) => (actuales.length ? actuales : [nuevaSub()]));
    } finally {
      if (numero === pedido.current) setProponiendo(false);
    }
  }, [conOrigen, escuela.id, ticketId, origenInteraccionId, actionItem?.texto]);

  useEffect(() => {
    void proponer();
  }, [proponer]);

  const cambiarSub = (clave: string, cambios: Partial<SubIssuePropuesta>) =>
    setSubs((actuales) => actuales.map((s) => (s.clave === clave ? { ...s, ...cambios } : s)));

  const subsValidas = subs.filter((s) => s.titulo.trim() !== '');
  const valido = titulo.trim() !== '' && quePidio.trim() !== '' && !proponiendo;

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    if (!valido || guardando) return;
    const input: NuevoLoopInput = {
      titulo: titulo.trim(),
      quePidio: quePidio.trim(),
      quienEsperaId: quienEsperaId || null,
      ownerId,
      origen,
      origenInteraccionId: origenInteraccionId ?? null,
      actionItemId: actionItem?.id,
      subIssues: subsValidas.map((s) => ({ titulo: s.titulo.trim(), descripcion: s.descripcion.trim(), equipo: s.equipo })),
    };
    setGuardando(true);
    const ok = await ejecutar(() => crearLoop(ctx, escuela, input), 'Loop creado');
    setGuardando(false);
    if (ok) onCerrar();
  };

  return (
    <PanelLateral titulo={`Nuevo loop · ${escuela.nombre}`} onCerrar={onCerrar}>
      <form onSubmit={crear} className="flex min-h-full flex-col gap-4">
        {conOrigen && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-4 w-4" aria-hidden />
              {proponiendo ? 'Armando la propuesta a partir del mensaje…' : 'Propuesta armada a partir del mensaje. Revisala antes de crear.'}
            </span>
            {!proponiendo && (
              <button type="button" onClick={() => void proponer()} className="inline-flex items-center gap-1 text-xs font-medium hover:underline">
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                Volver a proponer
              </button>
            )}
          </div>
        )}
        {errorPropuesta && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {errorPropuesta} Podés completar el loop a mano.
          </p>
        )}

        {proponiendo ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando propuesta">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
              Título
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={campo} autoFocus={!conOrigen} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
              Qué pidió la escuela
              <textarea value={quePidio} onChange={(e) => setQuePidio(e.target.value)} rows={3} className={`${campo} resize-y`} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Quién espera
                <select value={quienEsperaId} onChange={(e) => setQuienEsperaId(e.target.value)} className={campo}>
                  <option value="">Sin asignar</option>
                  {contactos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Owner
                <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={campo}>
                  {datos.equipo.map((m) => (
                    <option key={m.id} value={m.id}>
                      {etiquetaMiembro(datos.equipo, m)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sub-issues ({subsValidas.length})</h3>
                <button
                  type="button"
                  onClick={() => setSubs((actuales) => [...actuales, nuevaSub()])}
                  disabled={subs.length >= MAX_SUB_ISSUES}
                  className="inline-flex items-center gap-1 text-xs font-medium hover:underline disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Agregar
                </button>
              </div>
              {subs.length === 0 && <p className="text-sm text-muted-foreground">Sin sub-issues: el loop queda abierto hasta que agregues alguna.</p>}
              <ol className="flex flex-col gap-2">
                {subs.map((s, i) => (
                  <li key={s.clave} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 shrink-0 text-xs text-muted-foreground">{i + 1}.</span>
                      <input
                        value={s.titulo}
                        onChange={(e) => cambiarSub(s.clave, { titulo: e.target.value })}
                        placeholder="Qué hay que hacer"
                        aria-label={`Título de la sub-issue ${i + 1}`}
                        className={`${campo} min-w-0 flex-1`}
                      />
                      <select
                        value={s.equipo}
                        onChange={(e) => cambiarSub(s.clave, { equipo: e.target.value as EquipoIssue })}
                        aria-label={`Equipo de la sub-issue ${i + 1}`}
                        className={`${campo} w-28 shrink-0`}
                      >
                        {EQUIPOS.map((eq) => (
                          <option key={eq} value={eq}>
                            {eq}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setSubs((actuales) => actuales.filter((x) => x.clave !== s.clave))}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label={`Quitar la sub-issue ${i + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      value={s.descripcion}
                      onChange={(e) => cambiarSub(s.clave, { descripcion: e.target.value })}
                      rows={2}
                      placeholder="Contexto y cuándo está terminada (opcional)"
                      aria-label={`Descripción de la sub-issue ${i + 1}`}
                      className={`${campo} resize-y`}
                    />
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-200 pt-4">
          <p className="text-xs text-muted-foreground">
            {enLinear ? 'Se crea en Linear: el loop en CS y cada sub-issue en su equipo.' : 'Escuela de ejemplo: queda solo en el hub.'}
          </p>
          <div className="flex gap-2">
            <Boton variante="fantasma" type="button" onClick={onCerrar}>
              Cancelar
            </Boton>
            <Boton variante="primario" type="submit" disabled={!valido || guardando}>
              {guardando ? 'Creando…' : enLinear ? 'Crear en Linear' : 'Crear loop'}
            </Boton>
          </div>
        </div>
      </form>
    </PanelLateral>
  );
}
