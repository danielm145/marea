-- Casablanca · los 2 carros de la salida (Daniel, 9-oct-2026, 2 a.m.):
--   Lexus · maneja Kevin · van Alegría, Domenika, Naty y Ana Paula
--   Amarok · maneja Lenin · copiloto Daniel · atrás Jhon y Esteban
-- Ida y regreso iguales (se cambia en la app: Tareas → Carros). Idempotente: se puede correr dos veces.
-- Las personas se buscan por su primer nombre (sin tildes); si alguien no está, se salta sin fallar.
set search_path = marea, public;

create or replace function pg_temp.n(t text) returns text language sql immutable as $$
  select btrim(regexp_replace(lower(translate(coalesce(t, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')), '\s+', ' ', 'g'))
$$;
create or replace function pg_temp.p(prefijo text) returns uuid language sql stable as $$
  select id from marea.personas where activo and (pg_temp.n(nombre) like prefijo || '%' or pg_temp.n(coalesce(apodo, '')) like prefijo || '%')
  order by created_at limit 1
$$;

do $$
declare lexus uuid; amarok uuid; admin uuid; t text; x uuid;
begin
  select id into admin from marea.personas where rol = 'admin' and activo order by created_at limit 1;
  -- los dos carros (se reemplazan si ya existían con ese nombre)
  select id into lexus from marea.vehiculos where nombre = 'Lexus de Kevin' limit 1;
  if lexus is null then insert into marea.vehiculos (nombre, conductor, puestos, maletas, salida, nota, creado_por)
    values ('Lexus de Kevin', pg_temp.p('kevin'), 5, 5, 'Cumbayá · casa de la Ale · 8:00 a.m.', 'Maneja Kevin', admin) returning id into lexus;
  else update marea.vehiculos set conductor = pg_temp.p('kevin'), puestos = 5, salida = 'Cumbayá · casa de la Ale · 8:00 a.m.', nota = 'Maneja Kevin' where id = lexus; end if;
  select id into amarok from marea.vehiculos where nombre = 'Amarok de Lenin' limit 1;
  if amarok is null then insert into marea.vehiculos (nombre, conductor, puestos, maletas, salida, nota, creado_por)
    values ('Amarok de Lenin', pg_temp.p('lenin'), 5, 6, 'Cumbayá · casa de la Ale · 8:00 a.m.', 'Copiloto: Daniel', admin) returning id into amarok;
  else update marea.vehiculos set conductor = pg_temp.p('lenin'), puestos = 5, salida = 'Cumbayá · casa de la Ale · 8:00 a.m.', nota = 'Copiloto: Daniel' where id = amarok; end if;

  foreach t in array array['ida', 'regreso'] loop
    -- los conductores no ocupan puesto de pasajero
    delete from marea.pasajeros where trayecto = t and persona_id in (pg_temp.p('kevin'), pg_temp.p('lenin'));
    -- Lexus
    foreach x in array array[pg_temp.p('alegria'), pg_temp.p('domenika'), pg_temp.p('natalia'), pg_temp.p('ana paula')] loop
      if x is not null then insert into marea.pasajeros (vehiculo_id, persona_id, trayecto, maletas) values (lexus, x, t, 1)
        on conflict (persona_id, trayecto) do update set vehiculo_id = excluded.vehiculo_id; end if;
    end loop;
    -- Amarok (Daniel adelante, de copiloto)
    foreach x in array array[pg_temp.p('daniel'), pg_temp.p('jhon'), pg_temp.p('esteban')] loop
      if x is not null then insert into marea.pasajeros (vehiculo_id, persona_id, trayecto, maletas) values (amarok, x, t, 1)
        on conflict (persona_id, trayecto) do update set vehiculo_id = excluded.vehiculo_id; end if;
    end loop;
  end loop;
end $$;
