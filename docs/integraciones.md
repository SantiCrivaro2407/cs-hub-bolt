# Integraciones: Gmail y Read AI

El backoffice registra solo las interacciones (emails y reuniones) con **clientes**. La whitelist es la tabla `contactos`: un email o una reunión entra únicamente si alguno de esos emails aparece como remitente, destinatario, copia o participante. Todo lo demás se descarta. Para sumar a alguien, se lo carga como contacto en la ficha de su escuela.

## Cómo funciona

| Pieza | Qué hace |
| --- | --- |
| `supabase/migrations/20261104200000_integraciones.sql` | Columnas nuevas en `interacciones` (`origen`, `externo_id`, `de`, `para`, `enlace`), tablas `integraciones` e `integracion_secretos`. |
| `functions/gmail-oauth` | Conecta el Gmail de cada miembro (scopes `gmail.readonly` y `gmail.send`) y guarda el refresh token en `integracion_secretos`. Guarda en `integraciones.config.envio` si se otorgó el permiso de envío. |
| `functions/gmail-enviar` | Envía desde el Gmail del miembro las respuestas del hub (tickets, loops, emails, email nuevo). Si responde a un email traído de Gmail, va en el mismo hilo. Solo a contactos o al dominio de staff de la escuela. Sin permiso de envío, el hub solo registra la respuesta. |
| `functions/gmail-sync` | Busca en Gmail los mensajes con contactos (desde la última sync; la primera trae 12 meses) y los guarda con cuerpo completo, remitente y destinatarios. Lo dispara el botón "Sincronizar ahora" o el cron. |
| `functions/readai-webhook` | Recibe el reporte de Read AI al terminar una reunión; si participa algún contacto, crea una interacción `reunion` con resumen, duración, action items y link al reporte. |
| `functions/slack-tickets` | Publica cada ticket nuevo en el canal de Slack del equipo y sigue el ticket en su hilo (respuestas, resuelto, reabierto). La disparan triggers de la base con pg_net (`20261111150000_slack_tickets.sql`). |
| Pantalla **Integraciones** (`/integraciones`) | Cada miembro conecta su Gmail y genera su URL de webhook de Read AI. Muestra el estado de todo el equipo. |

Un mismo email o reunión no se registra dos veces (índice único `origen + externo_id + escuela_id`). Si involucra contactos de dos escuelas, se registra en ambas. Cada interacción importada actualiza `escuelas.ultimo_contacto`.

Los refresh tokens viven en `integracion_secretos`, que tiene RLS activo **sin políticas**: solo las Edge Functions (service role) los pueden leer.

## Puesta en marcha (equipo de tecnología)

### 1. Base de datos

Aplicar la migración en el proyecto de Supabase del backoffice:

```bash
supabase link --project-ref <REF>
supabase db push
```

Hasta que se aplique, el backoffice sigue funcionando: la pantalla de Integraciones aparece vacía y "Sincronizar" usa la simulación de la demo.

### 2. Google Cloud

1. Crear (o elegir) un proyecto en Google Cloud y habilitar **Gmail API**.
2. **OAuth consent screen**: si las casillas del equipo son de Google Workspace, tipo **Internal** (no requiere verificación de Google). Si no, **External**, y `gmail.readonly` es un scope restringido que requiere verificación para salir de modo prueba.
3. Scopes: `https://www.googleapis.com/auth/gmail.readonly` y `https://www.googleapis.com/auth/gmail.send`. Los miembros que conectaron antes de que se agregara el envío tienen que reconectar Gmail.
4. **Credentials → OAuth client ID → Web application**, con este redirect URI exacto:
   `https://<REF>.supabase.co/functions/v1/gmail-oauth`

### 3. Secretos de las funciones

```bash
supabase secrets set \
  GOOGLE_CLIENT_ID=... \
  GOOGLE_CLIENT_SECRET=... \
  OAUTH_STATE_SECRET=$(openssl rand -hex 32) \
  CRON_SECRET=$(openssl rand -hex 32) \
  APP_URL=https://<url-del-backoffice>
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya los inyecta Supabase.

### 4. Desplegar las funciones

```bash
supabase functions deploy gmail-oauth gmail-sync gmail-enviar readai-webhook slack-tickets
```

`supabase/config.toml` las marca con `verify_jwt = false`. Cada una valida la identidad por su cuenta:
- `gmail-oauth` usa un `state` firmado.
- `readai-webhook` usa el token de la URL.
- `gmail-sync` usa la sesión del backoffice o el header `x-cron-secret`.

### 5. Sincronización automática (cada 15 minutos)

En el SQL editor (requiere las extensiones `pg_cron` y `pg_net`):

```sql
select vault.create_secret('<CRON_SECRET>', 'cs_hub_cron_secret');

select cron.schedule('cs-hub-gmail-sync', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://<REF>.supabase.co/functions/v1/gmail-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cs_hub_cron_secret')
    )
  );
$$);
```

### 6. Read AI

Cada miembro entra a **Integraciones → Read AI → Generar URL de webhook** y pega esa URL en Read AI, en la sección de webhooks de sus integraciones. La URL es personal: el token identifica a quién del equipo pertenece la reunión. "Regenerar URL" invalida la anterior.

El webhook lee el payload de forma tolerante:
- id de sesión: `session_id` / `id`
- título: `title`
- horario: `start_time` / `end_time`
- participantes: `participants[].email`
- resumen: `summary`
- action items: `action_items`
- link al reporte: `report_url`

**Validarlo con la primera reunión real** (logs: `supabase functions logs readai-webhook`) y ajustar los nombres de campo si Read AI los cambia.

### 7. Slack: avisos de tickets

1. En [api.slack.com/apps](https://api.slack.com/apps) crear una app ("CS Hub") en el workspace de Volantis.
2. **OAuth & Permissions → Bot Token Scopes:** `chat:write`. Instalar la app y copiar el **Bot User OAuth Token** (`xoxb-…`).
3. En Slack, invitar la app al canal (`/invite @CS Hub`) y copiar el **ID del canal** (detalles del canal, abajo de todo; empieza con `C`).
4. Secretos de la función:

```bash
supabase secrets set \
  SLACK_BOT_TOKEN=xoxb-... \
  SLACK_CANAL_TICKETS=C0123456789 \
  SLACK_TRIGGER_SECRET=$(openssl rand -hex 32)
```

5. Aplicar la migración (`supabase db push`) y desplegar `slack-tickets` (paso 4).
6. En el SQL editor, darle a los triggers la URL de la función y el mismo secreto:

```sql
select vault.create_secret('https://<REF>.supabase.co/functions/v1/slack-tickets', 'slack_tickets_url');
select vault.create_secret('<SLACK_TRIGGER_SECRET>', 'slack_tickets_secret');
```

Hasta que existan esos dos secretos en el Vault, los triggers no hacen nada; nunca hacen fallar la carga de un ticket. Los tickets de la demo ("Reiniciar demo") no se publican; "Simular ticket nuevo" sí, porque es como uno real. Para probar: simular un ticket y ver el mensaje en el canal; el ticket muestra "Ver hilo en Slack". Si no llega, revisar `supabase functions logs slack-tickets` y la tabla `net._http_response`.

### 8. Linear: loops e issues en espejo

Loops e issues del hub son un espejo de Linear (workspace `volantis-education`):

- **Modelo.** Un loop es una issue del equipo **CS** con el label **Loop**. Sus sub-issues (en CS, Tech o Product) son las issues ligadas al loop. El estado del loop se deriva de sus sub-issues como siempre; si la issue padre se cierra en Linear, el loop se cierra en el hub.
- **Escuela.** Sale del prefijo del título (`[St. Francis] ...`), comparando con `escuelas.linear_alias` (por palabra completa, gana el alias más largo; los alias con `~`, como `~Transforma`, solo cuentan si el título no nombra un colegio concreto). Si no hay prefijo, se usa el label de la escuela en CS (`linear_label`) y, para sub-issues, la escuela de su loop. Escuela sin `linear_alias` = no se sincroniza (las demo viven solo en el hub).
- **Hub → Linear** (`linear-acciones`): crear loop (padre + sub-issues), crear issue, cambiar estado, ligar issue a un loop y cerrar el loop al responder (pasa a Done el padre y las sub-issues de CS abiertas). Primero se escribe en Linear y después se guarda el espejo.
- **Linear → Hub**: `linear-webhook` (al instante, firmado con HMAC) y `linear-sync` (cron cada 15 min a los :07/:22/:37/:52, respaldo; la primera vez trae 180 días). Los dos guardan con la misma función (`guardarDesdeLinear`), así que es idempotente.
- **Crear un loop con IA** (`loop-propuesta`): desde un ticket, un email o un action item, Claude (`claude-opus-5-5`, effort low) propone título, qué pidió, quién espera y las sub-issues por equipo. El CS la revisa y edita en el panel lateral antes de crearla.

Secretos: `LINEAR_API_KEY` (Linear → Settings → Security & access → Personal API keys, con permiso de escritura), `LINEAR_WEBHOOK_SECRET` (lo generamos nosotros; está en `~/.cs-hub-linear-webhook-secret`) y `ANTHROPIC_API_KEY`.

```bash
supabase secrets set --project-ref <ref> LINEAR_API_KEY=lin_api_... ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy linear-sync linear-webhook linear-acciones loop-propuesta --project-ref <ref> --no-verify-jwt --use-api
```

El webhook se registra una vez con la API de Linear (`webhookCreate`, recurso `Issue`, todos los equipos públicos) apuntando a `https://<ref>.supabase.co/functions/v1/linear-webhook` con el mismo secreto.

## Pendientes conocidos

- "Desconectar" Gmail deja de sincronizar, pero el refresh token queda guardado hasta que se reconecte o se borre la fila. Para revocarlo del todo, quitar el acceso desde la cuenta de Google (myaccount.google.com → Seguridad → Apps de terceros).
- Los adjuntos no se guardan; solo el cuerpo en texto (si el email es solo HTML, se convierte a texto).
- Slack: si un ticket se crea y se responde en el mismo segundo, puede quedar con dos mensajes raíz en el canal (las dos llamadas publican antes de que se guarde el hilo).
- Cada búsqueda en Gmail toma hasta 500 mensajes por bloque de 20 contactos. Alcanza para una sync cada 15 minutos; la primera sync de 12 meses puede quedar corta en casillas con mucho volumen.

## Seguridad (auditoría del 6/11)

La migración `20261111120000_endurecer_seguridad.sql` y los cambios en las funciones cierran lo que encontró la auditoría. Para que funcione completo, en Supabase hay que revisar:

- **Authentication → Providers → Email:** "Confirm email" y "Secure email change" activados. La membresía ahora queda atada al usuario (`equipo.user_id`), pero un miembro que todavía no se registró se reconoce por su email confirmado: con auto-confirmación, cualquiera que se registre primero con ese email se quedaría con el lugar.
- **Filas de `equipo` sin dueño real:** los emails de ejemplo `@volantis.example` conviene borrarlos o reemplazarlos por los reales antes de producción.
- **Google Cloud → OAuth consent screen:** tipo "Internal". Además, la función ahora rechaza conectar un Gmail distinto del email del miembro (`cuenta_distinta`), y cada link de conexión sirve una sola vez.
- **Contactos:** el sync de Gmail ignora como contacto cualquier email del equipo, de su dominio o de un Gmail conectado, así nadie puede hacer que se copie la casilla de un compañero.
