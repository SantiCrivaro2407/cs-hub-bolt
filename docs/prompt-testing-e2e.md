# Prompt: testing end to end del CS Hub

Copiá todo lo que está debajo de la línea y pegáselo a un agente que tenga navegador (Claude Code con el navegador integrado, Claude in Chrome o similar). Antes de pegarlo, dejá la app corriendo con `npm run dev` y la sesión iniciada.

---

Sos un QA senior. Tu trabajo es probar de punta a punta el **CS Hub de Volantis**, un backoffice interno de Customer Success, y entregar un reporte de bugs. **No arregles nada ni toques el código**: solo probá y reportá.

## La app

- Corre en `http://localhost:5173`. Es Vite + React + TypeScript + Tailwind, con datos en Supabase.
- La sesión ya está iniciada. **Nunca escribas contraseñas ni crees cuentas.** Si ves la pantalla de login, frená y pedime que inicie sesión.
- Los datos son de ejemplo (escuelas, contactos, tickets, loops, issues y health inventados), pero están en una base real. Todo lo que guardes queda guardado.

## Reglas de seguridad

1. **"Reiniciar demo"** (abajo a la izquierda) borra los datos y vuelve a cargar los de ejemplo. Pedime confirmación antes de usarlo. Si te la doy, usalo al principio para arrancar de un estado conocido y al final para dejar todo limpio.
2. **Integraciones:** no toques "Conectar Gmail" ni "Conectar Read AI". Abren flujos reales de Google y Read AI. Solo verificá que la pantalla cargue y se lea bien.
3. Enviar emails desde la app es **simulado**: solo registra la interacción, no manda nada. Podés enviar respuestas de prueba. Escribí siempre textos que empiecen con `[QA]` para reconocerlos.
4. Los links externos (Linear, PostHog) abrilos solo para verificar a dónde apuntan. No hagas nada dentro de esos sitios.

## Qué tiene que hacer cada pantalla

Recorré todo en este orden. En cada punto verificá lo que dice y anotá cualquier diferencia.

### Barra lateral

- Opciones, en este orden: Mis pendientes, Escuelas, Health, Tickets, Loops, Integraciones. Mis pendientes y Tickets tienen contador rojo; Loops, verde. Los contadores solo aparecen si son mayores a 0.
- El buscador global encuentra escuelas, contactos, tickets y loops, y lleva a cada uno.
- En pantallas angostas (375 px) la barra pasa a ser un menú horizontal arriba, con scroll, y no se corta ninguna opción.

### Mis pendientes (`/pendientes`)

- Muestra los tickets sin resolver y los loops abiertos **de los que la persona logueada es owner**, agrupados en Para responder, Vencidos y En curso.
- El contador rojo de la barra lateral suma los tickets nuevos, los loops para responder y los loops vencidos de esa persona.
- Problema conocido: hay dos miembros "Santiago" en el equipo, el de la demo y la cuenta real. Si la página sale vacía, asignale un ticket y un loop a la persona logueada desde su detalle y verificá que aparezcan.

### Escuelas (`/`)

- Grilla de tarjetas teñidas según el health: verde ≥ 70, amarillo 50–69, rojo < 50. Arriba no hay totales.
- Cada tarjeta muestra avatar, etapa, nombre, health con flecha de tendencia, "N issues abiertas" y "N loops abiertos". En 0, esas líneas van en gris.
- **Globito naranja claro** arriba a la derecha con la cantidad de pendientes de la escuela. Si no hay pendientes, no aparece. Al pasar el mouse muestra la lista.
- El número del globito tiene que coincidir con la cantidad de bullets de "Pendientes" dentro de esa escuela. Comprobalo en al menos 3 escuelas.
- Barra flotante abajo: la lupa busca por nombre; los filtros van por etapa, owner, color de health y "solo mías"; el ojito muestra cuántas escuelas quedan ocultas y limpia los filtros.

### Escuela (`/escuelas/<slug>`)

- **Encabezado:** nombre, chip de health, aviso "Caída de health" si bajó 15 puntos o más en 15 días, y selectores de Etapa y Owner. Cambiá la etapa y el owner, verificá el aviso de guardado y volvé a dejarlos como estaban.
- **Panel "Última semana":**
  - un párrafo de health (cierre vs semana anterior, estándar que más bajó con su dato, estándar más flojo si está por debajo de 50);
  - un párrafo de actividad de los últimos 7 días (emails, reuniones, tickets, loops, issues);
  - una lista de pendientes. Cada pendiente lleva a su lugar y los urgentes dicen "Vencido".
  - Verificá que los números del texto coincidan con lo que muestran las pestañas.
- **Pestañas,** en este orden: Health, Interacciones, Loops, Issues, Tickets, Ficha. Al entrar abre en Health. Loops, Issues y Tickets muestran un contador.
- **Health:** score, gráfico de las últimas 8 semanas y los 4 estándares (Actividad, Engagement, Calidad, Cobertura), cada uno con su arco y un detalle desplegable. No hay vista canvas.
- **Interacciones:**
  - lista agrupada por mes;
  - "Agregar nota" crea una nota;
  - "Simular (demo)" agrega interacciones;
  - en un email, "Responder" abre el **panel lateral derecho** con el mensaje original citado arriba;
  - en una reunión, cada action item permite "Crear loop".
- **Loops:**
  - se puede crear un "Nuevo loop";
  - al desplegar un loop se ven qué pidió, quién espera, origen, estado, owner, issues ligadas, historial y actividad;
  - "Responder a la escuela" abre el panel lateral y al enviar cierra el loop;
  - "Abrir en Linear" apunta a `linear.app/volantis-education/issue/<id del loop>`;
  - se puede ligar una issue existente y crear una issue en Tech;
  - si todas las issues ligadas quedan Done o Canceled, el loop pasa a "Ready to reply".
- **Issues:**
  - tabla con filtros por equipo y estado;
  - al tocar el título se abre el detalle: descripción, estado editable, asignado, loop y "Abrir en Linear";
  - cambiar el estado de una issue ligada actualiza su loop.
- **Tickets:** misma bandeja que la página Tickets, filtrada a la escuela.
- **Ficha:** campos por sección, con porcentaje de completitud y campos críticos marcados. Editá un campo, guardá, recargá y verificá que quedó guardado. Después volvé a dejarlo como estaba.

### Health (`/health`)

- Una fila por escuela, primero las que necesitan atención, con el total, la tendencia y un arco por estándar. Tocar una fila lleva a la pestaña Health de la escuela.

### Tickets (`/tickets`)

- Bandeja tipo mail:
  - pestañas Nuevos / En curso / Resueltos / Todos con su cantidad;
  - los nuevos van en negrita;
  - "Sin respuesta" en rojo si pasó más de 1 día hábil.
- Filtros por escuela, owner y "Solo míos".
- Al tocar un ticket se abre a la derecha, sin ventana emergente. Muestra:
  - estado y owner editables;
  - el mensaje original;
  - la sección **Grabación** (link a PostHog o "Este ticket no tiene grabación de PostHog");
  - la sección **Conversación**, con los emails del equipo y del cliente, sin duplicados, y el aviso "Respondió X hace N días" o "Nadie del equipo respondió todavía".
- "Responder" abre el panel lateral derecho con el mensaje del ticket citado, y ofrece "Marcar como resuelto". Enviá una respuesta `[QA]` y verificá que:
  - aparece en la conversación;
  - el estado cambia a En curso, o a Resuelto si tildaste la opción;
  - los contadores se actualizan.
- "Crear loop desde este ticket" crea el loop ligado.
- "Simular ticket nuevo" agrega un ticket en Nuevos.
- En 375 px, la lista y el ticket abierto se alternan con "Volver a la bandeja".

### Loops (`/loops`)

- Agrupados en Para responder, Vencidos (en días hábiles, del más viejo al más nuevo) y En curso. Los cerrados quedan colapsados al final.
- Filtros por escuela, owner y "Solo míos".
- Cada fila lleva a la pestaña Loops de su escuela con el loop desplegado.

### Integraciones (`/integraciones`)

- Carga sin errores. Muestra la nota de la lista blanca de contactos, las tarjetas de Gmail y Read AI y la tabla del equipo. No conectes nada.

### Transversal

- **Panel lateral de respuesta:** se cierra con Escape, con la X y tocando afuera, sin enviar nada.
- **Consola del navegador:** sin errores de JavaScript. Ignorá los errores de red de las integraciones (`gmail-oauth`, tabla `integraciones`), porque todavía no están deployadas.
- **Recarga:** los links profundos sobreviven a una recarga y muestran lo mismo. Por ejemplo `/escuelas/aleph?tab=issues&issue=TECH-1790` o `/tickets?ticket=<id>`.
- **Responsive:** repetí Escuelas, una escuela y Tickets en 375 px y en 768 px. Revisá que no haya scroll horizontal ni texto cortado ni botones tapados.
- **Modo oscuro:** si el sistema está en oscuro, revisá contraste y legibilidad.

## Casos de uso de punta a punta

Además de probar cada pantalla por separado, hacé estos recorridos completos como lo haría alguien de CS. En cada paso verificá que todas las pantallas reflejen el cambio: el globito, Mis pendientes, los contadores de la barra lateral, el resumen semanal y las pestañas.

1. **Ticket que necesita a Tech.**
   1. Simulá un ticket nuevo y asignátelo.
   2. Abrilo desde Mis pendientes y respondé `[QA]` sin resolverlo.
   3. Creá un loop desde el ticket.
   4. En ese loop, creá una issue en Tech.
   5. Pasá la issue a Done: el loop tiene que quedar en "Ready to reply" y aparecer en "Para responder" en todos lados.
   6. Respondé a la escuela desde el loop: el loop tiene que cerrarse y desaparecer de los pendientes.
2. **De una reunión a un loop.**
   1. En Interacciones, tomá una reunión con action items.
   2. Creá un loop desde un action item.
   3. Ese action item tiene que dejar de figurar como pendiente en el resumen y quedar ligado al loop.
3. **Investigar una caída de health.**
   1. Entrá a una escuela con "Caída de health".
   2. Verificá que el resumen explique qué estándar bajó y con qué dato.
   3. Comprobá que ese dato coincida con el detalle del estándar en la pestaña Health.
4. **Completar la ficha de una escuela en Onboarding.** Completá los campos críticos vacíos: el porcentaje sube y el aviso de campos críticos desaparece. Después dejá los campos como estaban.
5. **Reasignar trabajo.**
   1. Cambiá el owner de un ticket y de un loop a otra persona.
   2. Tienen que salir de tus pendientes y de "Solo míos".
   3. Devolvelos.
6. **Email nuevo.** Desde Interacciones, escribí un email nuevo a un contacto: tiene que aparecer en la lista y en el párrafo de actividad del resumen.

## Edge cases

Probá todos estos. Para cada uno, decí si pasó o falló.

**Formularios y validación**
- Enviar una respuesta con el mensaje vacío, con solo espacios o con el asunto vacío: el botón tiene que estar deshabilitado.
- En "Nuevo email", poner un destinatario de otro dominio (por ejemplo `alguien@gmail.com`), uno mal escrito o varios separados por comas con espacios de más. Solo se aceptan direcciones del dominio de staff de la escuela, con un mensaje claro.
- Ticket cuyo contacto no tiene email: "Responder" tiene que estar deshabilitado, no romperse.
- Crear un loop sin título, una nota vacía o una issue de Tech sin título: no tiene que dejar guardar.
- Textos muy largos (más de 5.000 caracteres), con saltos de línea, emojis, acentos y ñ: se guardan y se muestran bien, sin romper el layout.
- Texto con HTML o scripts (`<script>alert(1)</script>`, `<b>hola</b>`) en una nota o una respuesta: se tiene que ver como texto, sin ejecutarse.
- Doble click rápido en "Enviar", "Crear loop" o "Guardar": no se tiene que guardar dos veces.
- Cerrar el panel de respuesta (Escape, X o click afuera) con texto escrito: anotá si se pierde el borrador sin avisar.

**Estados vacíos y datos faltantes**
- Escuela sin mediciones de health, sin contactos, sin tickets, sin loops o sin issues: cada pestaña muestra un mensaje de vacío, no una pantalla rota. Si no hay ninguna así en la demo, decilo.
- Filtros que no devuelven nada (en Escuelas, Tickets, Loops e Issues): mensaje de vacío y forma de limpiar los filtros.
- Búsqueda sin resultados, con mayúsculas y minúsculas mezcladas, con o sin acentos ("Colegio" vs "colegio", "Trevino" vs "Treviño").
- Loop sin issues ligadas, y loop cuyas issues quedan todas en Canceled: anotá a qué estado pasa.
- Una issue que estaba en Done y vuelve a In Progress: el loop tiene que volver de "Ready to reply" a "Waiting".

**URLs y navegación**
- Escuela que no existe (`/escuelas/no-existe`), ruta inexistente (`/cualquiera`), `?tab=` inválido, `?ticket=` o `?issue=` con un id que no existe: mensaje claro o vuelta a la vista por defecto, nunca una pantalla en blanco.
- Botones atrás y adelante del navegador después de abrir tickets, issues y pestañas: el estado tiene que seguir a la URL.
- Abrir la misma escuela en dos pestañas, cambiar algo en una y recargar la otra.

**Reglas de negocio y bordes**
- Umbrales de color del health: una escuela con exactamente 70 tiene que ser verde, y una con exactamente 50, amarilla. Si los datos no tienen esos valores, revisá el código en `src/lib/domain/health.ts` y decí si los bordes están bien.
- Vencimientos en días hábiles: un ticket "Nuevo" vence después de 1 día hábil y un loop Open/Waiting después de 5. Comprobá que los fines de semana no cuenten (`src/lib/domain/loops.ts` y `dates.ts`).
- Globito con más de 9 pendientes: tiene que mostrar "9+".
- Singulares y plurales en todos los textos: "1 issue abierta" vs "2 issues abiertas", "1 día" vs "2 días", "hoy".
- Coherencia entre pantallas después de cada acción: el globito tiene que coincidir con los pendientes de la escuela, los contadores con las listas y "Mis pendientes" con lo que dice la barra lateral.

**Errores y red**
- Con la red cortada (en DevTools, "Offline"), intentá guardar algo: tiene que aparecer un aviso de error claro, sin perder lo escrito ni quedar en un estado a medias. Volvé a conectar y reintentá.
- Recargá la página en medio de un guardado.
- Red lenta (DevTools, "Slow 3G"): tiene que haber indicadores de carga y no tiene que dejar enviar dos veces.

**Accesibilidad**
- Recorrido completo solo con teclado (Tab, Enter, Escape): llegar a una escuela, abrir un ticket, responderlo y cerrar el panel.
- Foco visible en todos los elementos interactivos. Al abrir el panel lateral, el foco tiene que ir al panel.
- Iconos sin texto (lupa, ojito, X, Linear) con etiqueta accesible.

## Problemas ya conocidos (no los reportes como nuevos)

- Hay dos "Santiago" en el equipo, así que "Mis pendientes" y "Solo míos" pueden salir vacíos para la cuenta real.
- La migración `20261105120000_tickets_grabacion_issues_detalle.sql` puede no estar aplicada. En ese caso no hay grabaciones, descripciones de issues ni links propios a Linear, y los links se arman con el id.
- Las integraciones de Gmail y Read AI no están deployadas.
- Las grabaciones de PostHog de la demo son links inventados.

## Cómo reportar

Al final entregá un único reporte con:

1. **Resumen:** cuántas pruebas pasaron y cuántas fallaron, y tu impresión general en 2 o 3 líneas.
2. **Bugs,** del más grave al menos grave, en una tabla con estas columnas:
   - **Severidad:** Crítico (rompe un flujo o pierde datos), Alto (función que no anda), Medio (dato incorrecto o inconsistente) o Bajo (visual o texto).
   - **Pantalla.**
   - **Pasos para reproducirlo.**
   - **Qué esperabas.**
   - **Qué pasó.**
   - **Captura,** si la tenés.
3. **Casos de uso y edge cases:** una tabla con cada caso de las secciones anteriores y su resultado (pasó, falló o no probado).
4. **Inconsistencias de datos:** números que no coinciden entre pantallas (globito vs pendientes, contadores vs listas, texto del resumen vs pestañas).
5. **Sugerencias de UX:** separadas de los bugs, y como mucho 5.
6. **Lo que no pudiste probar** y por qué.

No inventes resultados: si algo no lo probaste, decilo.
