# Reporte de testing end to end · CS Hub

**Fecha:** 5 de noviembre de 2026. **Versión:** `main` en `c229da6`. **Entorno:** app local (`localhost:5173`) contra el Supabase real, con datos de demo. **Prompt usado:** [prompt-testing-e2e.md](prompt-testing-e2e.md).

## Resumen

Se probaron 6 casos de uso completos y 24 edge cases. Los 6 casos de uso pasaron (uno con un bug de validación). De los edge cases pasaron 21, fallaron 2 (de responsive) y 1 queda como decisión de producto. En total hay 5 bugs, ninguno crítico ni alto, y 4 cosas no se pudieron probar en vivo.

La plataforma está sólida en lo importante: los flujos completos de CS funcionan de punta a punta. Los contadores (globito, Mis pendientes, barra lateral, resumen semanal) coinciden entre sí después de cada acción, y no apareció ningún error de JavaScript. Las fallas son de layout en pantallas angostas, de validación en la Ficha y de detalles de redacción.

## Bugs

| # | Severidad | Pantalla | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|
| 1 | Medio | Escuela › Loops (375 px) | Abrir `/escuelas/aleph?tab=loops&loop=L-ALE-01` en un celular | El detalle entra en la pantalla | Los recuadros "Ligar issue existente" y "Crear issue en Tech" son más anchos que la pantalla. Los botones "Ligar" y "Crear" quedan cortados y el contenido se corre a la izquierda (se lee "SUES LIGADAS"). El grid `sm:grid-cols-2` en mobile no deja achicar el select o el input. |
| 2 | Medio | Escuela › Ficha | Editar → Contactos clave → poner `no-es-un-email` en un Email → Guardar | Validar el formato del email | Se guarda sin aviso y el campo cuenta como completo para el go-live (91 % → 95 %, "0 campos críticos vacíos"). |
| 3 | Medio | Owner (ticket, loop, escuela) | Abrir cualquier selector de owner | Poder distinguir a cada persona | Aparecen dos "Santiago" idénticos. Solo se sabe cuál es tu cuenta probando (es `dcbc…`). Es el problema conocido de datos, pero también es de UX: el selector no muestra el email. |
| 4 | Bajo | Escuela › Issues (768 px) | Abrir `/escuelas/aleph?tab=issues` en una tablet | Sin scroll horizontal | La página se puede scrollear 24 px de costado (`scrollWidth` 792 en un viewport de 768). |
| 5 | Bajo | Resumen "Última semana" | Entrar a una escuela con 1 ticket nuevo en la semana (Aleph, Casa Amarilla) | "Entró 1 ticket nuevo" | Dice "Entraron 1 ticket nuevo". |

## Casos de uso de punta a punta

| Caso | Resultado | Notas |
|---|---|---|
| 1. Ticket → loop → issue en Tech → Done → responder → loop cerrado | Pasó | Simular ticket: Nuevos 3 → 4 y Tickets 3 → 4. Asignarme: Mis pendientes 1 → 2. Responder `[QA]`: aparece en la conversación como "Respondió Santiago hoy" y pasa a En curso. Crear loop L-BZS-03: también crea solo la issue CS-186. Crear TECH-1801. Pasar las dos a Done: el loop queda en "Ready to reply", con aviso, y Loops 3 → 4. Responder desde el loop: con el mensaje citado y el botón "Enviar y cerrar loop", queda en Closed y los contadores bajan. |
| 2. Action item de una reunión → loop | Pasó | El modal viene con el título del action item cargado. Después de crear el loop, el action item muestra "Ver loop L-ALE-03" y sale de los pendientes del resumen. |
| 3. Investigar una caída de health | Pasó | Aleph: el resumen dice "Actividad (−9): quedan 6 invitaciones vencidas y 4 bloqueos de setup" y coincide con el detalle del estándar. Ver la observación 1 sobre el dato de uso semanal. |
| 4. Completar la Ficha | Pasó, con el bug #2 | El porcentaje y los críticos se actualizan y el cambio sobrevive a una recarga. Se restauró. |
| 5. Reasignar trabajo | Pasó | Cambiar el owner de un ticket mueve el contador de Mis pendientes al instante. |
| 6. Email nuevo | Pasó | La validación por dominio funciona (ver edge cases). |

## Edge cases

| Caso | Resultado |
|---|---|
| Nota vacía o con solo espacios | Pasó: "Guardar nota" queda deshabilitado |
| Email nuevo con "Para" vacío o solo comas | Pasó: botón deshabilitado |
| Email a `alguien@gmail.com` | Pasó: "Solo se puede escribir a direcciones de staff de la escuela", el panel sigue abierto y no se guarda nada |
| Issue de Tech o loop sin título | Pasó: botón deshabilitado |
| HTML o script en una nota (`<script>`, `<img onerror>`) | Pasó: se muestra como texto, no se ejecuta |
| Texto de 6.000 caracteres, emojis, ñ y acentos | Pasó: se guarda y se ve bien, sin desbordar |
| Doble click real en "Guardar nota" | Pasó: se crea una sola nota. Ver la observación 3. |
| Búsqueda global con mayúsculas, sin acentos ("trevino") o sin resultados | Pasó |
| Filtros de Escuelas sin resultados | Pasó: "No hay escuelas con esos filtros." El ojito dice "Mostrar 7 escuelas ocultas" y limpia todo |
| Issue reabierta (Done → In Progress) | Pasó: el loop vuelve a Waiting |
| Todas las issues del loop en Canceled | El loop pasa a "Ready to reply". Es una decisión de producto, ver la observación 2 |
| `/escuelas/no-existe`, `/cualquiera` | Pasó: "No encontramos esa escuela/página" |
| `?tab=` inválido, `?ticket=`, `?issue=` o `?loop=` inexistentes | Pasó: vuelve a la vista por defecto sin romperse, aunque no avisa que el id no existe |
| Atrás y adelante del navegador | Pasó: el estado sigue a la URL, y el detalle de la issue se reabre al ir adelante |
| Links de la home (`/loops?vencido=1`, `/tickets?estado=Nuevo`) | Pasó |
| Umbrales 70 y 50 del health | Pasó: la misma regla (≥ 70 y ≥ 50) en tarjetas, chips, arcos y filtros |
| Vencimientos en días hábiles | Pasó, revisado en el código: ticket > 1 y loop > 5 días hábiles, sin contar fines de semana. No contempla feriados. |
| Globito con más de 9 pendientes | Pasó en el código: muestra "9+". Ninguna escuela de la demo llega a 10. |
| Globito = cantidad de pendientes del resumen | Pasó en las 9 escuelas |
| Responsive a 375 px | Falló en el detalle de loop (bug #1). El resto pasó: Escuelas, escuela, Tickets (con "Volver a la bandeja"), Loops, Mis pendientes, Health e Integraciones |
| Responsive a 768 px | Falló en la pestaña Issues (bug #4). El resto pasó |
| Elementos interactivos sin nombre accesible | Pasó: ninguno en las 7 pantallas |
| Foco al abrir el panel de respuesta | Pasó: el cursor arranca en el cuerpo del mensaje |
| Errores de JavaScript en la consola | Pasó: ninguno. Solo hay 404 viejos de las integraciones sin deployar |

## Inconsistencias de datos

1. **Uso semanal vs Engagement.** En la demo, el "uso de la semana anterior" siempre es el de esta semana menos 4. Por eso el resumen dice "el uso semanal pasó de 10 % a 14 %" en escuelas donde Engagement bajó. Viene de `healthDemo.ts`, no de la lógica.
2. **El ticket no se cierra con su loop.** Cuando el loop que nació de un ticket se responde y se cierra, el ticket sigue "En curso". Conviene decidir si se resuelve solo o si avisa.

## Sugerencias de UX

1. **Crear loop desde un ticket:** precargar "Qué pidió la escuela" con el mensaje del ticket y "Quién espera" con su contacto. Hoy hay que escribirlos a mano.
2. **Selector de owner:** mostrar el email o el nombre completo para distinguir homónimos (bug #3).
3. **Panel de respuesta:** avisar antes de cerrar si hay texto escrito. Hoy Escape o un click afuera borran el borrador sin preguntar.
4. **Ids inexistentes en la URL:** mostrar un aviso ("Ese ticket ya no existe") en vez de ignorarlos en silencio.
5. **Ficha completa:** ocultar "0 campos críticos vacíos" cuando no falta nada, o reemplazarlo por "Lista para el go-live".

## Observaciones

1. **Guardas contra doble envío.** Usan estado de React (`guardando`, `enviando`). Con un doble click real funcionan. Con dos clicks programáticos en el mismo instante se creó la nota dos veces. No afecta a usuarios, pero un `useRef` lo haría a prueba de todo.
2. **Issues canceladas.** Que un loop con todas sus issues canceladas pase a "Ready to reply" tiene sentido (hay que contestarle a la escuela igual), pero el aviso dice "Todas las issues están resueltas", lo que puede confundir.
3. **Tickets simulados sin grabación.** "Simular ticket nuevo" no les pone grabación de PostHog. Los de la demo sí la tienen.

## Lo que no se pudo probar

- **Sin conexión y red lenta.** El cliente de Supabase guarda su propia referencia a `fetch`, así que no se pudo cortar la red desde JS, y el navegador integrado no expone DevTools. Revisado en el código: ante un error, `ejecutar` muestra "No se pudo guardar. Intentá de nuevo." y los modales quedan abiertos con lo escrito.
- **Recorrido completo solo con teclado y foco visible:** se revisaron las etiquetas y el foco del panel, pero no un recorrido manual con Tab.
- **Modo oscuro:** la app no define tema oscuro propio.
- **Integraciones (Gmail, Read AI):** fuera de alcance por seguridad. La pantalla carga bien.

## Datos de prueba que quedaron en la base

Todo está marcado con `[QA]`:

- **Casa Amarilla:** 4 notas (dos con HTML, "Doble click real" y "Sin red").
- **British Zona Sul:**
  - el ticket simulado "I cannot see my class observations", asignado a tu cuenta y con una respuesta `[QA]`;
  - el loop L-BZS-03 (cerrado), con las issues CS-186 y TECH-1801.
- **Colegio Aleph:** el loop L-ALE-03, creado desde un action item.

La Ficha de British Zona Sul se restauró. "Reiniciar demo" borra todo lo anterior.
