import { useMemo, useRef, useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useHub } from '@/context/HubContext';
import { navegar } from '@/lib/router';
import type { HubData } from '@/lib/types';

interface Resultado {
  clave: string;
  titulo: string;
  detalle: string;
  url: string;
}

function buscar(datos: HubData, texto: string): Resultado[] {
  const q = texto.trim().toLowerCase();
  if (q.length < 2) return [];
  const coincide = (...campos: (string | null | undefined)[]) => campos.some((c) => c?.toLowerCase().includes(q));
  const escuelaDe = (id: string) => datos.escuelas.find((e) => e.id === id);

  const escuelas: Resultado[] = datos.escuelas
    .filter((e) => coincide(e.nombre, e.slug))
    .map((e) => ({ clave: `e-${e.id}`, titulo: e.nombre, detalle: 'Escuela', url: `/escuelas/${e.slug}` }));
  const loops: Resultado[] = datos.loops
    .filter((l) => coincide(l.id, l.titulo))
    .map((l) => ({ clave: `l-${l.id}`, titulo: `${l.id} · ${l.titulo}`, detalle: `Loop · ${escuelaDe(l.escuela_id)?.nombre ?? ''}`, url: `/escuelas/${escuelaDe(l.escuela_id)?.slug ?? ''}?tab=loops&loop=${l.id}` }));
  const tickets: Resultado[] = datos.tickets
    .filter((t) => coincide(t.asunto, t.mensaje))
    .map((t) => ({ clave: `t-${t.id}`, titulo: t.asunto, detalle: `Ticket · ${escuelaDe(t.escuela_id)?.nombre ?? ''}`, url: '/tickets' }));
  const contactos: Resultado[] = datos.contactos
    .filter((c) => coincide(c.nombre, c.email, c.cargo))
    .map((c) => ({ clave: `c-${c.id}`, titulo: c.nombre, detalle: `Contacto · ${escuelaDe(c.escuela_id)?.nombre ?? ''}`, url: `/escuelas/${escuelaDe(c.escuela_id)?.slug ?? ''}` }));

  return [...escuelas, ...loops, ...tickets, ...contactos].slice(0, 12);
}

export function BuscadorGlobal() {
  const { datos } = useHub();
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const resultados = useMemo(() => buscar(datos, texto), [datos, texto]);

  useEffect(() => {
    const cerrarAfuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrarAfuera);
    return () => document.removeEventListener('mousedown', cerrarAfuera);
  }, []);

  return (
    <div ref={caja} className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        placeholder="Buscar…"
        className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      {abierto && texto.trim().length >= 2 && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-80 w-full min-w-72 overflow-y-auto rounded-xl border border-border bg-popover py-1 text-popover-foreground shadow-md">
          {resultados.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</p>}
          {resultados.map((r) => (
            <button
              key={r.clave}
              onClick={() => {
                setAbierto(false);
                setTexto('');
                navegar(r.url);
              }}
              className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-accent"
            >
              <span className="text-sm font-medium">{r.titulo}</span>
              <span className="text-xs text-muted-foreground">{r.detalle}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
