-- Casablanca v34 · los viajeros con su celular (lista que mandó Daniel por WhatsApp, 7-oct-2026).
-- Desde la v33 se entra SOLO con el celular: con estar aquí y activo, la persona ya entra
-- (la cuenta se le crea sola la primera vez que entra).
-- Idempotente:
--   · quien ya tiene ese celular no se toca;
--   · quien ya estaba en la lista sin celular (ej. «Kevin López», «Alegría») recibe el suyo, sin duplicarse;
--   · el resto se crea como invitado.
-- Solo esquema marea. El guard de personas (solo el admin cambia el celular) se apaga y se
-- vuelve a prender DENTRO de la misma transacción: si algo falla, todo se deshace, incluido eso.
set search_path = marea, public;

begin;
alter table personas disable trigger personas_guard;

create temp table _viajeros (nombre text, telefono text, alias text[]) on commit drop;
insert into _viajeros values
  ('Daniel Martínez',        '573244585384', array['daniel']),
  ('Ana Paula Ribadeneira',  '573008920401', array['ana paula','anita paula','anita paula ribadeneira']),
  ('Alegría Ribadeneira',    '593984938348', array['alegria']),
  ('Kevin López',            '593988441247', array['kevin']),
  ('Domenika Pérez',         '593992417742', array['domenika']),
  ('Natalia Vásquez',        '593983026751', array['natalia','naty']),
  ('Jhon Cevallos',          '593996326823', array['jhon','john cevallos']);

-- nombre comparable: minúsculas, sin tildes, un solo espacio
create or replace function pg_temp.n(t text) returns text language sql immutable as $$
  select btrim(regexp_replace(lower(translate(coalesce(t, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')), '\s+', ' ', 'g'))
$$;

-- 1 · ya estaban en la lista sin celular: se les pone (uno por viajero, el más antiguo)
with m as (
  select distinct on (v.telefono) p.id, v.telefono
  from _viajeros v
  join personas p on p.telefono is null
   and (pg_temp.n(p.nombre) = pg_temp.n(v.nombre)
        or pg_temp.n(p.nombre) in (select pg_temp.n(a) from unnest(v.alias) a))
  where not exists (select 1 from personas x where x.telefono = v.telefono)
  order by v.telefono, p.created_at
)
update personas p set telefono = m.telefono, activo = true
from m where p.id = m.id;

-- 2 · los que no estaban: se crean como invitados
insert into personas (nombre, telefono, rol, activo)
select v.nombre, v.telefono, 'invitado', true
from _viajeros v
where not exists (select 1 from personas x where x.telefono = v.telefono);

alter table personas enable trigger personas_guard;
commit;
