/*
# Crear esquema de CS Hub (backoffice de Customer Success)

1. Resumen
Crea todas las tablas del backoffice interno de Customer Success de Volantis Education: equipo, escuelas, fichas, health, contactos, interacciones, tickets, loops e issues. Solo los miembros del equipo pueden leer y escribir.

2. Tablas nuevas
- `equipo`: miembros del equipo de CS vinculados al usuario de login por email.
- `escuelas`: clientes, con etapa, owner, idioma y dominio de staff.
- `contactos`: personas de cada escuela con su rol.
- `tickets` y `ticket_mensajes`: mensajes de Talk with us y sus respuestas.
- `interacciones`: emails, reuniones, tickets, notas y registros internos. Pueden quedar ligadas a un loop o a un ticket.
- `loops`: pedidos pendientes de respuesta. Su origen puede ser una interacción.
- `loop_estados`: historial de estados de cada loop.
- `issues`: issues de Linear simuladas (CS y Tech), opcionalmente ligadas a un loop.
- `ficha_campos`: campos de la ficha de cada escuela.
- `health_snapshots`: puntajes semanales de health por escuela.

3. Seguridad
- RLS activado en todas las tablas.
- Solo usuarios autenticados cuyo email figura en `equipo` pueden leer y escribir (función `es_miembro_equipo`).
- No hay permisos de borrado desde el cliente. El único borrado es la función `reiniciar_demo_escuelas`, que también exige ser miembro del equipo.
- Ninguna tabla es accesible para `anon`.

4. Notas importantes
- Los ids de loops e issues son códigos de texto (ej. "L-COL-02", "CS-169").
- `interacciones.loop_id` se agrega al final porque loops e interacciones se referencian mutuamente.
- Las migraciones son idempotentes: se pueden volver a aplicar sin duplicar datos.
*/

CREATE TABLE IF NOT EXISTS equipo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS escuelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  slug text NOT NULL UNIQUE,
  codigo text NOT NULL UNIQUE,
  iniciales text NOT NULL,
  idioma text NOT NULL CHECK (idioma IN ('ES', 'EN')),
  grupo_pagador text,
  sedes text,
  etapa text NOT NULL CHECK (etapa IN ('Piloto', 'Onboarding', 'Live', 'Renovación')),
  owner_id uuid REFERENCES equipo(id) ON DELETE SET NULL,
  dominio_staff text NOT NULL,
  ultimo_contacto timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contactos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escuela_id uuid NOT NULL REFERENCES escuelas(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  cargo text,
  email text,
  rol text NOT NULL CHECK (rol IN ('decisor', 'champion', 'liaison', 'admin', 'docente'))
);

CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escuela_id uuid NOT NULL REFERENCES escuelas(id) ON DELETE CASCADE,
  contacto_id uuid REFERENCES contactos(id) ON DELETE SET NULL,
  asunto text NOT NULL,
  mensaje text NOT NULL,
  estado text NOT NULL CHECK (estado IN ('Nuevo', 'En curso', 'Resuelto')),
  owner_id uuid REFERENCES equipo(id) ON DELETE SET NULL,
  creado timestamptz NOT NULL DEFAULT now(),
  actualizado timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_mensajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  autor text NOT NULL,
  cuerpo text NOT NULL,
  fecha timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interacciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escuela_id uuid NOT NULL REFERENCES escuelas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('email_recibido', 'email_enviado', 'reunion', 'ticket', 'nota', 'registro_interno')),
  titulo text NOT NULL,
  autor text NOT NULL,
  fecha timestamptz NOT NULL DEFAULT now(),
  cuerpo text NOT NULL DEFAULT '',
  duracion_min integer,
  action_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS loops (
  id text PRIMARY KEY,
  escuela_id uuid NOT NULL REFERENCES escuelas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  que_pidio text NOT NULL DEFAULT '',
  quien_espera uuid REFERENCES contactos(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES equipo(id) ON DELETE SET NULL,
  origen text NOT NULL CHECK (origen IN ('email', 'reunion', 'ticket', 'manual')),
  origen_interaccion_id uuid REFERENCES interacciones(id) ON DELETE SET NULL,
  estado text NOT NULL CHECK (estado IN ('Open', 'Waiting', 'Ready to reply', 'Closed')),
  creado timestamptz NOT NULL DEFAULT now(),
  cerrado timestamptz
);

ALTER TABLE interacciones ADD COLUMN IF NOT EXISTS loop_id text REFERENCES loops(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS loop_estados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id text NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  estado text NOT NULL CHECK (estado IN ('Open', 'Waiting', 'Ready to reply', 'Closed')),
  fecha timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS issues (
  id text PRIMARY KEY,
  escuela_id uuid NOT NULL REFERENCES escuelas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  equipo text NOT NULL CHECK (equipo IN ('CS', 'Tech')),
  estado text NOT NULL CHECK (estado IN ('Backlog', 'Todo', 'In Progress', 'In Review', 'Done', 'Canceled')),
  asignado text NOT NULL DEFAULT 'Sin asignar',
  actualizada timestamptz NOT NULL DEFAULT now(),
  loop_id text REFERENCES loops(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ficha_campos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escuela_id uuid NOT NULL REFERENCES escuelas(id) ON DELETE CASCADE,
  seccion text NOT NULL,
  grupo text,
  campo text NOT NULL,
  valor text,
  critico boolean NOT NULL DEFAULT false,
  orden integer NOT NULL DEFAULT 0,
  actualizado timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escuela_id uuid NOT NULL REFERENCES escuelas(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  activacion integer NOT NULL CHECK (activacion BETWEEN 0 AND 100),
  engagement integer NOT NULL CHECK (engagement BETWEEN 0 AND 100),
  calidad integer NOT NULL CHECK (calidad BETWEEN 0 AND 100),
  cobertura integer NOT NULL CHECK (cobertura BETWEEN 0 AND 100),
  resultados integer NOT NULL CHECK (resultados BETWEEN 0 AND 100),
  metricas jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (escuela_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_contactos_escuela ON contactos(escuela_id);
CREATE INDEX IF NOT EXISTS idx_tickets_escuela ON tickets(escuela_id);
CREATE INDEX IF NOT EXISTS idx_ticket_mensajes_ticket ON ticket_mensajes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_interacciones_escuela_fecha ON interacciones(escuela_id, fecha);
CREATE INDEX IF NOT EXISTS idx_interacciones_loop ON interacciones(loop_id);
CREATE INDEX IF NOT EXISTS idx_loops_escuela ON loops(escuela_id);
CREATE INDEX IF NOT EXISTS idx_loop_estados_loop ON loop_estados(loop_id);
CREATE INDEX IF NOT EXISTS idx_issues_escuela ON issues(escuela_id);
CREATE INDEX IF NOT EXISTS idx_issues_loop ON issues(loop_id);
CREATE INDEX IF NOT EXISTS idx_ficha_escuela ON ficha_campos(escuela_id);
CREATE INDEX IF NOT EXISTS idx_health_escuela_fecha ON health_snapshots(escuela_id, fecha);

CREATE OR REPLACE FUNCTION public.es_miembro_equipo()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM equipo WHERE lower(email) = lower(auth.email())
  );
$$;

REVOKE EXECUTE ON FUNCTION public.es_miembro_equipo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_miembro_equipo() TO authenticated;

CREATE OR REPLACE FUNCTION public.reiniciar_demo_escuelas()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM escuelas WHERE public.es_miembro_equipo();
$$;

REVOKE EXECUTE ON FUNCTION public.reiniciar_demo_escuelas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reiniciar_demo_escuelas() TO authenticated;

ALTER TABLE equipo ENABLE ROW LEVEL SECURITY;
ALTER TABLE escuelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE loops ENABLE ROW LEVEL SECURITY;
ALTER TABLE loop_estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE ficha_campos ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_snapshots ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON equipo TO authenticated;
GRANT SELECT, INSERT, UPDATE ON escuelas, contactos, tickets, ticket_mensajes, interacciones, loops, loop_estados, issues, ficha_campos, health_snapshots TO authenticated;

DROP POLICY IF EXISTS "equipo_select_miembros" ON equipo;
CREATE POLICY "equipo_select_miembros" ON equipo FOR SELECT TO authenticated USING (public.es_miembro_equipo());

DROP POLICY IF EXISTS "escuelas_select_equipo" ON escuelas;
CREATE POLICY "escuelas_select_equipo" ON escuelas FOR SELECT TO authenticated USING (public.es_miembro_equipo());
DROP POLICY IF EXISTS "escuelas_insert_equipo" ON escuelas;
CREATE POLICY "escuelas_insert_equipo" ON escuelas FOR INSERT TO authenticated WITH CHECK (public.es_miembro_equipo());
DROP POLICY IF EXISTS "escuelas_update_equipo" ON escuelas;
CREATE POLICY "escuelas_update_equipo" ON escuelas FOR UPDATE TO authenticated USING (public.es_miembro_equipo()) WITH CHECK (public.es_miembro_equipo());

DROP POLICY IF EXISTS "contactos_select_equipo" ON contactos;
CREATE POLICY "contactos_select_equipo" ON contactos FOR SELECT TO authenticated USING (public.es_miembro_equipo());
DROP POLICY IF EXISTS "contactos_insert_equipo" ON contactos;
CREATE POLICY "contactos_insert_equipo" ON contactos FOR INSERT TO authenticated WITH CHECK (public.es_miembro_equipo());
DROP POLICY IF EXISTS "contactos_update_equipo" ON contactos;
CREATE POLICY "contactos_update_equipo" ON contactos FOR UPDATE TO authenticated USING (public.es_miembro_equipo()) WITH CHECK (public.es_miembro_equipo());

DROP POLICY IF EXISTS "tickets_select_equipo" ON tickets;
CREATE POLICY "tickets_select_equipo" ON tickets FOR SELECT TO authenticated USING (public.es_miembro_equipo());
DROP POLICY IF EXISTS "tickets_insert_equipo" ON tickets;
CREATE POLICY "tickets_insert_equipo" ON tickets FOR INSERT TO authenticated WITH CHECK (public.es_miembro_equipo());
DROP POLICY IF EXISTS "tickets_update_equipo" ON tickets;
CREATE POLICY "tickets_update_equipo" ON tickets FOR UPDATE TO authenticated USING (public.es_miembro_equipo()) WITH CHECK (public.es_miembro_equipo());

DROP POLICY IF EXISTS "ticket_mensajes_select_equipo" ON ticket_mensajes;
CREATE POLICY "ticket_mensajes_select_equipo" ON ticket_mensajes FOR SELECT TO authenticated USING (public.es_miembro_equipo());
DROP POLICY IF EXISTS "ticket_mensajes_insert_equipo" ON ticket_mensajes;
CREATE POLICY "ticket_mensajes_insert_equipo" ON ticket_mensajes FOR INSERT TO authenticated WITH CHECK (public.es_miembro_equipo());
DROP POLICY IF EXISTS "ticket_mensajes_update_equipo" ON ticket_mensajes;
CREATE POLICY "ticket_mensajes_update_equipo" ON ticket_mensajes FOR UPDATE TO authenticated USING (public.es_miembro_equipo()) WITH CHECK (public.es_miembro_equipo());

DROP POLICY IF EXISTS "interacciones_select_equipo" ON interacciones;
CREATE POLICY "interacciones_select_equipo" ON interacciones FOR SELECT TO authenticated USING (public.es_miembro_equipo());
DROP POLICY IF EXISTS "interacciones_insert_equipo" ON interacciones;
CREATE POLICY "interacciones_insert_equipo" ON interacciones FOR INSERT TO authenticated WITH CHECK (public.es_miembro_equipo());
DROP POLICY IF EXISTS "interacciones_update_equipo" ON interacciones;
CREATE POLICY "interacciones_update_equipo" ON interacciones FOR UPDATE TO authenticated USING (public.es_miembro_equipo()) WITH CHECK (public.es_miembro_equipo());

DROP POLICY IF EXISTS "loops_select_equipo" ON loops;
CREATE POLICY "loops_select_equipo" ON loops FOR SELECT TO authenticated USING (public.es_miembro_equipo());
DROP POLICY IF EXISTS "loops_insert_equipo" ON loops;
CREATE POLICY "loops_insert_equipo" ON loops FOR INSERT TO authenticated WITH CHECK (public.es_miembro_equipo());
DROP POLICY IF EXISTS "loops_update_equipo" ON loops;
CREATE POLICY "loops_update_equipo" ON loops FOR UPDATE TO authenticated USING (public.es_miembro_equipo()) WITH CHECK (public.es_miembro_equipo());

DROP POLICY IF EXISTS "loop_estados_select_equipo" ON loop_estados;
CREATE POLICY "loop_estados_select_equipo" ON loop_estados FOR SELECT TO authenticated USING (public.es_miembro_equipo());
DROP POLICY IF EXISTS "loop_estados_insert_equipo" ON loop_estados;
CREATE POLICY "loop_estados_insert_equipo" ON loop_estados FOR INSERT TO authenticated WITH CHECK (public.es_miembro_equipo());
DROP POLICY IF EXISTS "loop_estados_update_equipo" ON loop_estados;
CREATE POLICY "loop_estados_update_equipo" ON loop_estados FOR UPDATE TO authenticated USING (public.es_miembro_equipo()) WITH CHECK (public.es_miembro_equipo());

DROP POLICY IF EXISTS "issues_select_equipo" ON issues;
CREATE POLICY "issues_select_equipo" ON issues FOR SELECT TO authenticated USING (public.es_miembro_equipo());
DROP POLICY IF EXISTS "issues_insert_equipo" ON issues;
CREATE POLICY "issues_insert_equipo" ON issues FOR INSERT TO authenticated WITH CHECK (public.es_miembro_equipo());
DROP POLICY IF EXISTS "issues_update_equipo" ON issues;
CREATE POLICY "issues_update_equipo" ON issues FOR UPDATE TO authenticated USING (public.es_miembro_equipo()) WITH CHECK (public.es_miembro_equipo());

DROP POLICY IF EXISTS "ficha_select_equipo" ON ficha_campos;
CREATE POLICY "ficha_select_equipo" ON ficha_campos FOR SELECT TO authenticated USING (public.es_miembro_equipo());
DROP POLICY IF EXISTS "ficha_insert_equipo" ON ficha_campos;
CREATE POLICY "ficha_insert_equipo" ON ficha_campos FOR INSERT TO authenticated WITH CHECK (public.es_miembro_equipo());
DROP POLICY IF EXISTS "ficha_update_equipo" ON ficha_campos;
CREATE POLICY "ficha_update_equipo" ON ficha_campos FOR UPDATE TO authenticated USING (public.es_miembro_equipo()) WITH CHECK (public.es_miembro_equipo());

DROP POLICY IF EXISTS "health_select_equipo" ON health_snapshots;
CREATE POLICY "health_select_equipo" ON health_snapshots FOR SELECT TO authenticated USING (public.es_miembro_equipo());
DROP POLICY IF EXISTS "health_insert_equipo" ON health_snapshots;
CREATE POLICY "health_insert_equipo" ON health_snapshots FOR INSERT TO authenticated WITH CHECK (public.es_miembro_equipo());
DROP POLICY IF EXISTS "health_update_equipo" ON health_snapshots;
CREATE POLICY "health_update_equipo" ON health_snapshots FOR UPDATE TO authenticated USING (public.es_miembro_equipo()) WITH CHECK (public.es_miembro_equipo());

INSERT INTO equipo (nombre, email) VALUES
  ('Santiago', 'santiago@volantis.example'),
  ('Marco', 'marco@volantis.example'),
  ('Ignacio', 'ignacio@volantis.example'),
  ('Santos', 'santos@volantis.example')
ON CONFLICT (email) DO NOTHING;
