/*
# Seguridad: arreglos de la auditoría del 6/11

1. Membresía atada al usuario, no al email
   `es_miembro_equipo()` comparaba el email del JWT con `equipo`. Si el proyecto aceptara altas o cambios de
   email sin confirmar, cualquiera podía registrarse con el email de un miembro y entrar.
   - `equipo.user_id` ata cada miembro a su cuenta de auth.users. Se completa ahora con las cuentas ya
     confirmadas; una fila con user_id solo vale para ese usuario, aunque otro tenga el mismo email.
   - Una fila sin user_id (miembro que todavía no se registró) solo se acepta con el email confirmado, y la
     primera cuenta que la usa queda atada (`reclamar_membresia()`, la llama el backoffice al entrar).
   - `mi_equipo_id()` aplica la misma regla y la usan las políticas de `integraciones`.
   Igual hay que tener "Confirm email" activado en Supabase Auth: con auto-confirmación, una fila todavía
   sin reclamar la podría tomar quien se registre primero con ese email.

2. `oauth_estados`: nonce de un solo uso para conectar Gmail (lo escriben y borran solo las Edge Functions).

3. Links guardados solo https (grabación de PostHog, links de Linear, reporte de Read AI) y emails de
   contacto con formato válido. Las restricciones son NOT VALID: valen para todo lo nuevo sin bloquear
   la migración si hubiera filas viejas que no cumplen.

La migración es idempotente.
*/

ALTER TABLE equipo ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE equipo e
SET user_id = u.id
FROM auth.users u
WHERE e.user_id IS NULL
  AND lower(e.email) = lower(u.email)
  AND u.email_confirmed_at IS NOT NULL;

-- El id del miembro de la sesión: por user_id, o por email confirmado si la fila todavía no se reclamó.
CREATE OR REPLACE FUNCTION public.mi_equipo_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id
  FROM equipo e
  JOIN auth.users u ON u.id = auth.uid()
  WHERE e.user_id = u.id
     OR (e.user_id IS NULL AND lower(e.email) = lower(u.email) AND u.email_confirmed_at IS NOT NULL)
  ORDER BY (e.user_id IS NOT DISTINCT FROM u.id) DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.es_miembro_equipo()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.mi_equipo_id() IS NOT NULL;
$$;

-- Ata la fila sin reclamar a la cuenta que entra. Idempotente; no hace nada si ya está atada.
CREATE OR REPLACE FUNCTION public.reclamar_membresia()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE equipo e
  SET user_id = auth.uid()
  FROM auth.users u
  WHERE u.id = auth.uid()
    AND e.user_id IS NULL
    AND lower(e.email) = lower(u.email)
    AND u.email_confirmed_at IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM equipo o WHERE o.user_id = auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.reclamar_membresia() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reclamar_membresia() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mi_equipo_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mi_equipo_id() TO authenticated;

DROP POLICY IF EXISTS "integraciones_insert_propias" ON integraciones;
CREATE POLICY "integraciones_insert_propias" ON integraciones FOR INSERT TO authenticated
  WITH CHECK (equipo_id = public.mi_equipo_id());

DROP POLICY IF EXISTS "integraciones_update_propias" ON integraciones;
CREATE POLICY "integraciones_update_propias" ON integraciones FOR UPDATE TO authenticated
  USING (equipo_id = public.mi_equipo_id())
  WITH CHECK (equipo_id = public.mi_equipo_id());

DROP POLICY IF EXISTS "integraciones_delete_propias" ON integraciones;
CREATE POLICY "integraciones_delete_propias" ON integraciones FOR DELETE TO authenticated
  USING (equipo_id = public.mi_equipo_id());

CREATE TABLE IF NOT EXISTS oauth_estados (
  nonce uuid PRIMARY KEY,
  equipo_id uuid NOT NULL REFERENCES equipo(id) ON DELETE CASCADE,
  creado timestamptz NOT NULL DEFAULT now()
);
-- RLS sin políticas: solo el service role de las Edge Functions.
ALTER TABLE oauth_estados ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_grabacion_url_https') THEN
    ALTER TABLE tickets ADD CONSTRAINT tickets_grabacion_url_https CHECK (grabacion_url IS NULL OR grabacion_url ~* '^https://') NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'issues_url_https') THEN
    ALTER TABLE issues ADD CONSTRAINT issues_url_https CHECK (url IS NULL OR url ~* '^https://') NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loops_url_https') THEN
    ALTER TABLE loops ADD CONSTRAINT loops_url_https CHECK (url IS NULL OR url ~* '^https://') NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'interacciones_enlace_https') THEN
    ALTER TABLE interacciones ADD CONSTRAINT interacciones_enlace_https CHECK (enlace IS NULL OR enlace ~* '^https://') NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contactos_email_formato') THEN
    ALTER TABLE contactos ADD CONSTRAINT contactos_email_formato
      CHECK (email IS NULL OR email ~* '^[a-z0-9._+''-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$') NOT VALID;
  END IF;
END $$;
