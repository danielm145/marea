-- v28/v29 · las fechas reales del viaje: viernes 9 al lunes 12 de octubre de 2026 (Daniel, 7-oct-2026).
-- Idempotente. Solo esquema marea. Pisa solo fechas vacías o las de prueba (28 oct – 1 nov), no unas que el admin puso.
update marea.config set valor = valor || jsonb_build_object('desde','2026-10-09','hasta','2026-10-12')
 where clave = 'viaje'
   and (coalesce(valor->>'desde','') = '' or coalesce(valor->>'hasta','') = ''
        or (valor->>'desde' = '2026-10-28' and valor->>'hasta' = '2026-11-01'));
