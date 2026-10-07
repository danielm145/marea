-- v19 · el viaje se llama Our Beach Era (Daniel, 7-oct-2026). Casablanca queda como el nombre de la casa.
-- Idempotente. Solo esquema marea. Solo cambia nombres por defecto (no pisa uno que se haya escrito a mano).
update marea.config set valor = valor || jsonb_build_object('nombre','Our Beach Era')
 where clave = 'viaje' and coalesce(valor->>'nombre','') in ('','Marea Alta','Beach Trip','Casablanca');
