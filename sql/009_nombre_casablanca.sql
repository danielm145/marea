-- v17 · el viaje se llama Casablanca (Daniel, 7-oct-2026). Idempotente. Solo esquema marea.
update marea.config set valor = valor || jsonb_build_object('nombre','Casablanca')
 where clave = 'viaje' and coalesce(valor->>'nombre','') in ('','Marea Alta','Beach Trip');
