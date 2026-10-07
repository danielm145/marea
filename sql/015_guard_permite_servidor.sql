-- Casablanca v35 · el guard de personas dejaba por fuera al SERVIDOR.
-- Síntoma (Kevin, 7-oct-2026): al entrar solo con el celular salía «solo el admin puede cambiar ese campo».
-- Causa: la función marea-admin-personas usa la llave de servicio, y para el guard eso no es «admin»
-- (es_admin() mira auth.uid(), que con la llave de servicio no existe) → no podía anotar la cuenta nueva
-- (auth_id) ni cambiar celulares desde Administrar.
-- Ahora el guard deja pasar: al admin de la app, a la llave de servicio (la Edge Function) y a una conexión
-- directa a la base sin API (SQL editor / scripts/conectar.mjs). Una persona normal sigue sin poder cambiarse
-- el celular, el rol ni el nombre. Idempotente. Solo esquema marea.
set search_path = marea, public;

create or replace function personas_guard_tg() returns trigger
language plpgsql security definer set search_path = marea, public as $$
declare
  rol_api text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role');
begin
  if rol_api = 'service_role' or rol_api is null or es_admin() then
    return new;   -- servidor, conexión directa o admin
  end if;
  if new.rol is distinct from old.rol or new.cedula is distinct from old.cedula
     or new.activo is distinct from old.activo or new.auth_id is distinct from old.auth_id
     or new.nombre is distinct from old.nombre or new.emergencia is distinct from old.emergencia
     or new.telefono is distinct from old.telefono or new.cumple is distinct from old.cumple then
    raise exception 'solo el admin puede cambiar ese campo';
  end if;
  return new;
end $$;
