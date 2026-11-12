/*
# Avisos de tickets a un canal de Slack

Cada ticket nuevo se publica en el canal del equipo. Las respuestas y los cambios de estado se publican
en el hilo de ese mensaje. Lo hace la Edge Function `slack-tickets`; la llaman estos triggers con pg_net,
así funciona igual para tickets creados desde el backoffice, la demo o el futuro widget "Talk with us".

1. `tickets.slack_ts` / `tickets.slack_url`: mensaje de Slack del ticket (raíz del hilo) y su link.
   Los tickets de la demo se cargan con `slack_ts = 'demo'` y no se publican.
2. `avisar_slack_ticket()`: arma el evento y lo manda a la función. Lee la URL y el secreto del Vault
   (`slack_tickets_url`, `slack_tickets_secret`). Si no están cargados no hace nada, y nunca hace fallar
   la escritura del ticket: cualquier error queda como WARNING.
3. Triggers: alta de ticket, cambio de estado y respuesta del equipo (ticket_mensajes).

La migración es idempotente.
*/

CREATE EXTENSION IF NOT EXISTS pg_net;

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS slack_ts text;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS slack_url text;

CREATE OR REPLACE FUNCTION public.avisar_slack_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  destino text;
  secreto text;
  evento jsonb;
BEGIN
  IF TG_TABLE_NAME = 'tickets' AND TG_OP = 'INSERT' THEN
    IF NEW.slack_ts IS NOT NULL THEN
      RETURN NEW;
    END IF;
    evento := jsonb_build_object('evento', 'ticket_nuevo', 'ticket_id', NEW.id);
  ELSIF TG_TABLE_NAME = 'tickets' THEN
    IF NEW.estado IS NOT DISTINCT FROM OLD.estado OR NEW.slack_ts = 'demo' THEN
      RETURN NEW;
    END IF;
    evento := jsonb_build_object('evento', 'ticket_estado', 'ticket_id', NEW.id, 'estado', NEW.estado);
  ELSE
    -- Respuestas viejas (las de la demo) no se publican.
    IF NEW.fecha < now() - interval '1 hour' THEN
      RETURN NEW;
    END IF;
    evento := jsonb_build_object('evento', 'ticket_respuesta', 'ticket_id', NEW.ticket_id, 'mensaje_id', NEW.id);
  END IF;

  SELECT decrypted_secret INTO destino FROM vault.decrypted_secrets WHERE name = 'slack_tickets_url';
  SELECT decrypted_secret INTO secreto FROM vault.decrypted_secrets WHERE name = 'slack_tickets_secret';
  IF destino IS NULL OR secreto IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := destino,
    body := evento,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-trigger-secret', secreto)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'avisar_slack_ticket: %', SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.avisar_slack_ticket() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS slack_ticket_nuevo ON tickets;
CREATE TRIGGER slack_ticket_nuevo AFTER INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION public.avisar_slack_ticket();

DROP TRIGGER IF EXISTS slack_ticket_estado ON tickets;
CREATE TRIGGER slack_ticket_estado AFTER UPDATE OF estado ON tickets
  FOR EACH ROW EXECUTE FUNCTION public.avisar_slack_ticket();

DROP TRIGGER IF EXISTS slack_ticket_respuesta ON ticket_mensajes;
CREATE TRIGGER slack_ticket_respuesta AFTER INSERT ON ticket_mensajes
  FOR EACH ROW EXECUTE FUNCTION public.avisar_slack_ticket();
