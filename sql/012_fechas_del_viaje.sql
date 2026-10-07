-- v28 · las fechas reales del viaje: miércoles 28 de octubre al domingo 1 de noviembre de 2026 (Daniel, 7-oct-2026).
-- Idempotente. Solo esquema marea. Solo las pone si no hay fechas (no pisa lo que el admin ya guardó).
update marea.config set valor = valor || jsonb_build_object('desde','2026-10-28','hasta','2026-11-01')
 where clave = 'viaje' and (coalesce(valor->>'desde','') = '' or coalesce(valor->>'hasta','') = '');
