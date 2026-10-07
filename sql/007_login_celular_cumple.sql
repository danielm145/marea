-- Beach Trip v8 · se entra con el CELULAR y una clave de 4 dígitos = día y mes del cumpleaños (DDMM).
-- (Decisión de Daniel, 7-oct-2026: ya no se usa la cédula.)
-- La contraseña real vive en Auth: `<celular>#<DDMM>` con email `<celular>@marea.local` (lo crea marea-admin-personas).
-- Idempotente. Solo esquema marea.
set search_path = marea, public;

alter table personas alter column cedula drop not null;          -- la cédula queda opcional (ya no es el usuario)
alter table personas add column if not exists cumple text;       -- 'MM-DD', sin año: es la clave, no un dato de edad

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'personas_cumple_chk') then
    alter table personas add constraint personas_cumple_chk
      check (cumple is null or cumple ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'personas_telefono_chk') then
    alter table personas add constraint personas_telefono_chk
      check (telefono is null or telefono ~ '^[0-9]{11,15}$') not valid;   -- formato internacional sin '+', ej. 593985576470
  end if;
end $$;

-- un celular = una persona (es el usuario)
create unique index if not exists personas_telefono_ux on personas (telefono) where telefono is not null;

-- celular y cumpleaños son el usuario y la clave: solo el admin (vía la Edge Function) los cambia
create or replace function personas_guard_tg() returns trigger
language plpgsql security definer set search_path = marea, public as $$
begin
  if not es_admin() then
    if new.rol is distinct from old.rol or new.cedula is distinct from old.cedula
       or new.activo is distinct from old.activo or new.auth_id is distinct from old.auth_id
       or new.nombre is distinct from old.nombre or new.emergencia is distinct from old.emergencia
       or new.telefono is distinct from old.telefono or new.cumple is distinct from old.cumple then
      raise exception 'solo el admin puede cambiar ese campo';
    end if;
  end if;
  return new;
end $$;
