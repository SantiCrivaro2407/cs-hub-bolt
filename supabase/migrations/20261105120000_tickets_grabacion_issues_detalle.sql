/*
# Grabación de PostHog en tickets, detalle de issues y link de loops a Linear

1. `tickets.grabacion_url`: link a la grabación de PostHog de la sesión desde la que se abrió el ticket.
   El widget "Talk with us" puede mandarla con `posthog.get_session_replay_url()` al crear el ticket.
2. `issues.descripcion` y `issues.url`: detalle de la issue y link directo a Linear.
3. `loops.url`: cada loop es una issue de Linear; link directo a ella.

La migración es idempotente.
*/

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS grabacion_url text;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS descripcion text;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE loops ADD COLUMN IF NOT EXISTS url text;
