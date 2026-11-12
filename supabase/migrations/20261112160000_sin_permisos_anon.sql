/*
# El rol anónimo no tiene permisos sobre las tablas

Supabase le da por defecto permisos de tabla al rol `anon` (quien llama a la API sin sesión). RLS ya le
devolvía cero filas en todo, pero se le sacan los permisos como segunda barrera: si un día se agrega una
política con un error, alguien sin login igual no puede leer ni escribir nada. El CS Hub no usa la API sin
sesión (el login va por Auth, no por las tablas) y las Edge Functions usan el service role.
*/
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
