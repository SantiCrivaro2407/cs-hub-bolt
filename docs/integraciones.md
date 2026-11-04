# Integraciones: Gmail y Read AI

El backoffice registra solo las interacciones (emails y reuniones) con **clientes**. La whitelist es la tabla `contactos`: un email o una reunión entra únicamente si alguno de esos emails aparece como remitente, destinatario, copia o participante. Todo lo demás se descarta. Para sumar a alguien, se lo carga como contacto en la ficha de su escuela.

## Cómo funciona

| Pieza | Qué hace |
| --- | --- |
| `supabase/migrations/20261104200000_integraciones.sql` | Columnas nuevas en `interacciones` (`origen`, `externo_id`, `de`, `para`, `enlace`), tablas `integraciones` e `integracion_secretos`. |
| `functions/gmail-oauth` | Conecta el Gmail de cada miembro (scope `gmail.readonly`) y guarda el refresh token en `integracion_secretos`. |
| `functions/gmail-sync` | Busca en Gmail los mensajes con contactos (desde la última sync; la primera trae 30 días) y los guarda con cuerpo completo, remitente y destinatarios. Lo dispara el botón "Sincronizar ahora" o el cron. |
| `functions/readai-webhook` | Recibe el reporte de Read AI al terminar una reunión; si participa algún contacto, crea una interacción `reunion` con resumen, duración, action items y link al reporte. |
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
3. Scope: `https://www.googleapis.com/auth/gmail.readonly`.
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
supabase functions deploy gmail-oauth gmail-sync readai-webhook
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

## Pendientes conocidos

- "Desconectar" Gmail deja de sincronizar, pero el refresh token queda guardado hasta que se reconecte o se borre la fila. Para revocarlo del todo, quitar el acceso desde la cuenta de Google (myaccount.google.com → Seguridad → Apps de terceros).
- Los adjuntos no se guardan; solo el cuerpo en texto (si el email es solo HTML, se convierte a texto).
- Cada búsqueda en Gmail toma hasta 500 mensajes por bloque de 20 contactos. Alcanza para una sync cada 15 minutos; la primera sync de 30 días puede quedar corta en casillas con mucho volumen.
