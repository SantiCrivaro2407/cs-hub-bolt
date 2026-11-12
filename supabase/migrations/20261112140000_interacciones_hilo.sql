/*
# Hilos de conversación en interacciones

`interacciones.hilo`: agrupa los mensajes de una misma conversación.
- Emails de Gmail (traídos o enviados desde el hub): `gmail:<threadId>`.
- Respuestas registradas sin Gmail: el hilo del mensaje al que responden, o `id:<id del original>`.
Los tickets se agrupan además por `ticket_id`. Las filas viejas de Gmail se completan solas en la sync.
*/
ALTER TABLE interacciones ADD COLUMN IF NOT EXISTS hilo text;
CREATE INDEX IF NOT EXISTS idx_interacciones_hilo ON interacciones(hilo);
