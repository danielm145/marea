-- v17/v20 · el viaje se llama Casablanca (Daniel, 7-oct-2026). Idempotente. Solo esquema marea.
-- Solo cambia nombres por defecto (incluye «Our Beach Era», que se usó un rato en la v19); no pisa uno escrito a mano.
update marea.config set valor = valor || jsonb_build_object('nombre','Casablanca')
 where clave = 'viaje' and coalesce(valor->>'nombre','') in ('','Marea Alta','Beach Trip','Our Beach Era');
