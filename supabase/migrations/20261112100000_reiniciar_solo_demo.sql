/*
# "Reiniciar demo" solo borra las escuelas de ejemplo

Antes `reiniciar_demo_escuelas()` borraba todas las escuelas. Ahora conviven clientes reales con escuelas
de ejemplo, así que recibe la lista de slugs a borrar y no toca el resto. Los datos asociados (contactos,
tickets, interacciones, loops, issues, ficha, health) se van por cascada. La migración es idempotente.
*/

DROP FUNCTION IF EXISTS public.reiniciar_demo_escuelas();

CREATE OR REPLACE FUNCTION public.reiniciar_demo_escuelas(slugs text[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM escuelas WHERE public.es_miembro_equipo() AND slug = ANY(slugs);
$$;

REVOKE EXECUTE ON FUNCTION public.reiniciar_demo_escuelas(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reiniciar_demo_escuelas(text[]) TO authenticated;
