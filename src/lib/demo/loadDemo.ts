import { supabase } from '@/lib/supabase';
import { ESCUELAS_DEMO } from '@/lib/demo/escuelasDemo';
import { ISSUES_DEMO, LOOPS_DEMO } from '@/lib/demo/loopsDemo';
import { fichaDemo } from '@/lib/demo/fichaDemo';
import { healthDemo } from '@/lib/demo/healthDemo';
import { estadoDerivadoLoop } from '@/lib/domain/loops';
import type { Equipo } from '@/lib/types';

const DIA_MS = 24 * 60 * 60 * 1000;
const HORA_MS = 60 * 60 * 1000;
const CHUNK = 200;

type Fila = object;

// PGRST204: la columna no existe. Pasa si la base todavía no tiene la última migración.
const COLUMNA_INEXISTENTE = 'PGRST204';

/** Inserta en tandas. Si la base no tiene alguna columna `opcional`, la saca y reintenta sin ella. */
async function insertar(tabla: string, filas: Fila[], opcionales: string[] = []): Promise<void> {
  for (let i = 0; i < filas.length; i += CHUNK) {
    const tanda = filas.slice(i, i + CHUNK);
    let { error } = await supabase.from(tabla).insert(tanda);
    if (error?.code === COLUMNA_INEXISTENTE && opcionales.length > 0) {
      console.warn(`${tabla}: falta aplicar la última migración, se carga sin ${opcionales.join(', ')}`);
      const sinOpcionales = tanda.map((fila) => Object.fromEntries(Object.entries(fila).filter(([clave]) => !opcionales.includes(clave))));
      ({ error } = await supabase.from(tabla).insert(sinOpcionales));
    }
    if (error) throw new Error(`No se pudo cargar ${tabla}: ${error.message}`);
  }
}

export async function cargarDatosDemo(equipo: Equipo[]): Promise<void> {
  const { error: resetError } = await supabase.rpc('reiniciar_demo_escuelas');
  if (resetError) throw new Error(`No se pudo reiniciar la demo: ${resetError.message}`);

  const ahora = Date.now();
  const haceIso = (dias: number) => new Date(ahora - dias * DIA_MS).toISOString();
  const nuevoId = () => crypto.randomUUID();
  const idEquipo = (nombre: string) => equipo.find((m) => m.nombre === nombre)?.id ?? null;

  const escuelaIds = new Map(ESCUELAS_DEMO.map((e) => [e.slug, nuevoId()]));
  const contactoIds = new Map<string, string>();
  const origenes = new Map<string, string>();
  const escuelaPorSlug = (slug: string): string => {
    const id = escuelaIds.get(slug);
    if (!id) throw new Error(`Escuela demo desconocida: ${slug}`);
    return id;
  };

  const escuelas: Fila[] = [];
  const contactos: Fila[] = [];
  const tickets: Fila[] = [];
  const mensajes: Fila[] = [];
  const interacciones: Fila[] = [];
  const fichas: Fila[] = [];
  const salud: Fila[] = [];

  for (const e of ESCUELAS_DEMO) {
    const escuelaId = escuelaPorSlug(e.slug);

    escuelas.push({
      id: escuelaId,
      nombre: e.nombre,
      slug: e.slug,
      codigo: e.codigo,
      iniciales: e.iniciales,
      idioma: e.idioma,
      grupo_pagador: e.grupoPagador ?? null,
      sedes: e.sedes ?? null,
      etapa: e.etapa,
      owner_id: idEquipo(e.owner),
      dominio_staff: e.dominio,
      ultimo_contacto: haceIso(e.ultimoContactoHace),
    });

    for (const c of e.contactos) {
      const id = nuevoId();
      contactoIds.set(`${e.slug}:${c.local}`, id);
      contactos.push({
        id,
        escuela_id: escuelaId,
        nombre: c.nombre,
        cargo: c.cargo,
        email: `${c.local}@${e.dominio}`,
        rol: c.rol,
      });
    }

    for (const t of e.tickets) {
      const ticketId = nuevoId();
      const contacto = e.contactos.find((c) => c.local === t.contacto);
      const ultimaRespuesta = t.respuestas?.at(-1);
      tickets.push({
        id: ticketId,
        escuela_id: escuelaId,
        contacto_id: contactoIds.get(`${e.slug}:${t.contacto}`) ?? null,
        asunto: t.asunto,
        mensaje: t.mensaje,
        estado: t.estado,
        owner_id: idEquipo(e.owner),
        creado: haceIso(t.hace),
        actualizado: haceIso(ultimaRespuesta?.hace ?? t.hace),
        // Demo: links con el formato de PostHog que no apuntan a grabaciones reales.
        grabacion_url: `https://us.posthog.com/replay/${ticketId}`,
      });
      for (const r of t.respuestas ?? []) {
        mensajes.push({ id: nuevoId(), ticket_id: ticketId, autor: r.autor, cuerpo: r.cuerpo, fecha: haceIso(r.hace) });
        // La respuesta también sale como email, igual que cuando se responde desde el hub.
        interacciones.push({
          id: nuevoId(),
          escuela_id: escuelaId,
          tipo: 'email_enviado',
          titulo: `Re: ${t.asunto}`,
          autor: r.autor,
          fecha: haceIso(r.hace),
          cuerpo: `Para: ${t.contacto}@${e.dominio}\n\n${r.cuerpo}`,
          duracion_min: null,
          action_items: [],
          ticket_id: ticketId,
        });
      }
      const interaccionId = nuevoId();
      if (t.origenDeLoop) origenes.set(t.origenDeLoop, interaccionId);
      interacciones.push({
        id: interaccionId,
        escuela_id: escuelaId,
        tipo: 'ticket',
        titulo: `Ticket: ${t.asunto}`,
        autor: contacto?.nombre ?? 'Contacto',
        fecha: haceIso(t.hace),
        cuerpo: t.mensaje,
        duracion_min: null,
        action_items: [],
        ticket_id: ticketId,
      });
    }

    for (const i of e.interacciones) {
      const id = nuevoId();
      if (i.origenDeLoop) origenes.set(i.origenDeLoop, id);
      interacciones.push({
        id,
        escuela_id: escuelaId,
        tipo: i.tipo,
        titulo: i.titulo,
        autor: i.autor,
        fecha: haceIso(i.hace),
        cuerpo: i.cuerpo,
        duracion_min: i.duracion ?? null,
        action_items: (i.actionItems ?? []).map((item) => ({
          id: nuevoId(),
          texto: item.texto,
          loop_id: item.loopId ?? null,
        })),
        ticket_id: null,
      });
    }

    fichas.push(...fichaDemo(e, escuelaId, nuevoId));
    salud.push(...healthDemo(e, escuelaId, nuevoId));
  }

  const loopsConEstado = LOOPS_DEMO.map((l) => {
    const issues = ISSUES_DEMO.filter((issue) => issue.loop === l.id);
    const estado = issues.length === 0 ? 'Open' : estadoDerivadoLoop(issues);
    return { demo: l, issues, estado };
  });

  const loops: Fila[] = loopsConEstado.map(({ demo, estado }) => ({
    id: demo.id,
    escuela_id: escuelaPorSlug(demo.escuela),
    titulo: demo.titulo,
    que_pidio: demo.quePidio,
    quien_espera: contactoIds.get(`${demo.escuela}:${demo.espera}`) ?? null,
    owner_id: idEquipo(demo.owner),
    origen: demo.origen,
    origen_interaccion_id: origenes.get(demo.id) ?? null,
    estado,
    creado: haceIso(demo.hace),
    cerrado: null,
  }));

  const estados: Fila[] = loopsConEstado.flatMap(({ demo, issues, estado }) => {
    const creado = haceIso(demo.hace);
    const historial: Fila[] = [{ id: nuevoId(), loop_id: demo.id, estado: 'Open', fecha: creado }];
    if (issues.length > 0) {
      historial.push({
        id: nuevoId(),
        loop_id: demo.id,
        estado: 'Waiting',
        fecha: new Date(new Date(creado).getTime() + 2 * HORA_MS).toISOString(),
      });
    }
    if (estado === 'Ready to reply') {
      historial.push({ id: nuevoId(), loop_id: demo.id, estado: 'Ready to reply', fecha: haceIso(1) });
    }
    return historial;
  });

  const issues: Fila[] = ISSUES_DEMO.map((i) => ({
    id: i.id,
    escuela_id: escuelaPorSlug(i.escuela),
    titulo: i.titulo,
    equipo: i.equipo,
    estado: i.estado,
    asignado: i.asignado,
    actualizada: haceIso(i.hace),
    loop_id: i.loop ?? null,
    descripcion: i.descripcion ?? null,
  }));

  await insertar('escuelas', escuelas);
  await insertar('contactos', contactos);
  await insertar('tickets', tickets, ['grabacion_url']);
  await insertar('ticket_mensajes', mensajes);
  await insertar('interacciones', interacciones);
  await insertar('loops', loops);
  await insertar('loop_estados', estados);
  await insertar('issues', issues, ['descripcion']);
  await insertar('ficha_campos', fichas);
  await insertar('health_snapshots', salud);
}
