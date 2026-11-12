/*
# Registro abierto solo para @volantisedu.com y @itba.edu.ar

1. `dominio_permitido(email)`: los dos dominios que pueden tener cuenta en el CS Hub.
2. Trigger en `auth.users`: rechaza el alta (o el cambio de email) de cualquier otro dominio. Vale aunque
   alguien llame a la API de Auth directo, sin pasar por la pantalla de login.
3. `reclamar_membresia()`: además de atar una fila de `equipo` ya cargada, ahora da de alta en el equipo
   a quien entra por primera vez con un dominio permitido y el email confirmado. Toma el nombre que se
   cargó al crear la cuenta (o la parte del email antes de la @).

La seguridad sigue apoyada en "Confirm email" de Supabase Auth: sin confirmar el email no se entra.
Decisión del dueño del proyecto: las cuentas de los dos dominios ven lo mismo que el equipo de CS.
*/

CREATE OR REPLACE FUNCTION public.dominio_permitido(email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(split_part(coalesce(email, ''), '@', 2)) IN ('volantisedu.com', 'itba.edu.ar');
$$;

CREATE OR REPLACE FUNCTION public.validar_dominio_registro()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.dominio_permitido(NEW.email) THEN
    RAISE EXCEPTION 'dominio_no_permitido: solo se aceptan cuentas @volantisedu.com o @itba.edu.ar'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validar_dominio_registro ON auth.users;
CREATE TRIGGER validar_dominio_registro
  BEFORE INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.validar_dominio_registro();

CREATE OR REPLACE FUNCTION public.reclamar_membresia()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u auth.users%ROWTYPE;
BEGIN
  SELECT * INTO u FROM auth.users WHERE id = auth.uid();
  IF NOT FOUND OR u.email_confirmed_at IS NULL OR EXISTS (SELECT 1 FROM equipo WHERE user_id = u.id) THEN
    RETURN;
  END IF;

  -- 1. Una fila ya cargada con ese email y sin reclamar: queda atada a esta cuenta.
  UPDATE equipo SET user_id = u.id
  WHERE user_id IS NULL AND lower(email) = lower(u.email);
  IF FOUND THEN
    RETURN;
  END IF;

  -- 2. Dominio permitido y sin fila: alta automática en el equipo.
  IF public.dominio_permitido(u.email) THEN
    INSERT INTO equipo (nombre, email, user_id)
    VALUES (
      left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'nombre'), ''), initcap(split_part(u.email, '@', 1))), 80),
      lower(u.email),
      u.id
    )
    ON CONFLICT (email) DO NOTHING;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reclamar_membresia() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reclamar_membresia() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.validar_dominio_registro() FROM PUBLIC, anon, authenticated;
