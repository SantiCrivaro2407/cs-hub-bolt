/*
# Integraciones: Gmail y Read AI

Registra automáticamente en `interacciones` los emails y reuniones del equipo con contactos de clientes.
Solo se guardan intercambios donde participa algún email de la tabla `contactos` (la whitelist sale del backoffice).

1. `interacciones` gana columnas para lo que viene de afuera
   - `origen`: manual | gmail | readai
   - `externo_id`: id del mensaje de Gmail o de la sesión de Read AI (evita duplicados)
   - `de`, `para`: remitente y destinatarios (to + cc) del email
   - `enlace`: link al reporte de Read AI

2. `integraciones`: qué conectó cada miembro del equipo (visible para el equipo)
   - `config` guarda datos no secretos; para Read AI, el token de su URL de webhook

3. `integracion_secretos`: refresh tokens de Google. RLS activo y SIN políticas:
   solo las Edge Functions (service role) pueden leerlos o escribirlos.

La migración es idempotente.
*/

ALTER TABLE interacciones ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'manual';
ALTER TABLE interacciones ADD COLUMN IF NOT EXISTS externo_id text;
ALTER TABLE interacciones ADD COLUMN IF NOT EXISTS de text;
ALTER TABLE interacciones ADD COLUMN IF NOT EXISTS para text[] NOT NULL DEFAULT '{}';
ALTER TABLE interacciones ADD COLUMN IF NOT EXISTS enlace text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'interacciones_origen_check') THEN
    ALTER TABLE interacciones ADD CONSTRAINT interacciones_origen_check CHECK (origen IN ('manual', 'gmail', 'readai'));
  END IF;
END $$;

-- Un mismo email puede tocar contactos de dos escuelas: se registra una vez por escuela.
-- Sin WHERE para que las Edge Functions puedan usar ON CONFLICT; las manuales tienen externo_id NULL y no chocan.
CREATE UNIQUE INDEX IF NOT EXISTS idx_interacciones_externo ON interacciones(origen, externo_id, escuela_id);

CREATE INDEX IF NOT EXISTS idx_contactos_email ON contactos(lower(email));

CREATE TABLE IF NOT EXISTS integraciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id uuid NOT NULL REFERENCES equipo(id) ON DELETE CASCADE,
  proveedor text NOT NULL CHECK (proveedor IN ('gmail', 'readai')),
  estado text NOT NULL DEFAULT 'conectada' CHECK (estado IN ('conectada', 'error', 'desconectada')),
  cuenta text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ultima_sync timestamptz,
  ultimo_error text,
  creado timestamptz NOT NULL DEFAULT now(),
  UNIQUE (equipo_id, proveedor)
);

CREATE TABLE IF NOT EXISTS integracion_secretos (
  integracion_id uuid PRIMARY KEY REFERENCES integraciones(id) ON DELETE CASCADE,
  refresh_token text NOT NULL,
  actualizado timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE integraciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE integracion_secretos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "integraciones_select_equipo" ON integraciones;
CREATE POLICY "integraciones_select_equipo" ON integraciones FOR SELECT TO authenticated USING (public.es_miembro_equipo());

-- Cada miembro maneja solo sus propias integraciones.
DROP POLICY IF EXISTS "integraciones_insert_propias" ON integraciones;
CREATE POLICY "integraciones_insert_propias" ON integraciones FOR INSERT TO authenticated
  WITH CHECK (equipo_id IN (SELECT id FROM equipo WHERE lower(email) = lower(auth.email())));

DROP POLICY IF EXISTS "integraciones_update_propias" ON integraciones;
CREATE POLICY "integraciones_update_propias" ON integraciones FOR UPDATE TO authenticated
  USING (equipo_id IN (SELECT id FROM equipo WHERE lower(email) = lower(auth.email())))
  WITH CHECK (equipo_id IN (SELECT id FROM equipo WHERE lower(email) = lower(auth.email())));

DROP POLICY IF EXISTS "integraciones_delete_propias" ON integraciones;
CREATE POLICY "integraciones_delete_propias" ON integraciones FOR DELETE TO authenticated
  USING (equipo_id IN (SELECT id FROM equipo WHERE lower(email) = lower(auth.email())));
