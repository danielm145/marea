-- Casablanca v52 (Daniel, 9-oct-2026):
--   1. DESAYUNOS de todos los días: ceviche de camarón y pescado, fruta picada (sandía, piña, papaya) para todo el día,
--      jugo de naranja colado, jugo de coco, yogurt con arándanos y plato principal: bolón o tigrillo.
--   2. CARROS: Daniel maneja el Lexus con las chicas (Alegría, Domenika, Naty, Ana Paula);
--      la Amarok, los chicos (maneja Lenin; van Kevin, Jhon y Esteban).
--   3. LOOKS: la guía de cada look (lo que describe Alegría + lo que arma la IA con las fotos de Instagram).
-- Idempotente. Solo esquema marea.
set search_path = marea, public;

create or replace function pg_temp.n(t text) returns text language sql immutable as $$
  select btrim(regexp_replace(lower(translate(coalesce(t, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')), '\s+', ' ', 'g'))
$$;
create or replace function pg_temp.p(prefijo text) returns uuid language sql stable as $$
  select id from marea.personas where activo and (pg_temp.n(nombre) like prefijo || '%' or pg_temp.n(coalesce(apodo, '')) like prefijo || '%')
  order by created_at limit 1
$$;

-- 1 · DESAYUNOS ------------------------------------------------------------------------------
do $$
declare admin uuid; c record;
begin
  select id into admin from marea.personas where rol = 'admin' and activo order by created_at limit 1;
  for c in select id from marea.comidas where turno = 'desayuno' loop
    update marea.comidas set titulo = 'Desayuno costeño', modalidad = 'dual',
      notas = 'Todos los días: ceviche de camarón y pescado, fruta picada, jugo de naranja colado, jugo de coco y yogurt con arándanos. Plato principal: bolón o tigrillo.'
     where id = c.id;
    -- el plato principal: A = bolón, B = tigrillo (lo demás va en la mesa para todos)
    delete from marea.platos where comida_id = c.id and coalesce(opcion, '') not in ('A', 'B');
    if exists (select 1 from marea.platos where comida_id = c.id and opcion = 'A') then
      update marea.platos set nombre = 'Bolón mixto de queso y chicharrón', descripcion = 'Bolón de verde majado a mano con queso y chicharrón, dorado, con huevo al gusto.',
        estilo = 'Majado a mano y dorado', ingredientes = array['Verde','Queso fresco','Chicharrón','Huevo','Mantequilla'], tags = array['#Costeño','#Tradicional'], alergenos = '{}', foto = null
       where comida_id = c.id and opcion = 'A';
    else
      insert into marea.platos (comida_id, nombre, descripcion, estilo, ingredientes, tags, opcion, creado_por)
      values (c.id, 'Bolón mixto de queso y chicharrón', 'Bolón de verde majado a mano con queso y chicharrón, dorado, con huevo al gusto.', 'Majado a mano y dorado',
              array['Verde','Queso fresco','Chicharrón','Huevo','Mantequilla'], array['#Costeño','#Tradicional'], 'A', admin);
    end if;
    if exists (select 1 from marea.platos where comida_id = c.id and opcion = 'B') then
      update marea.platos set nombre = 'Tigrillo de queso con huevo', descripcion = 'Tigrillo de verde con queso fresco y huevo, con aguacate.',
        estilo = 'Costeño, en sartén', ingredientes = array['Verde','Queso fresco','Huevo','Aguacate','Cebolla blanca','Mantequilla'], tags = array['#Costeño','#Tradicional'], alergenos = '{}', foto = null
       where comida_id = c.id and opcion = 'B';
    else
      insert into marea.platos (comida_id, nombre, descripcion, estilo, ingredientes, tags, opcion, creado_por)
      values (c.id, 'Tigrillo de queso con huevo', 'Tigrillo de verde con queso fresco y huevo, con aguacate.', 'Costeño, en sartén',
              array['Verde','Queso fresco','Huevo','Aguacate','Cebolla blanca','Mantequilla'], array['#Costeño','#Tradicional'], 'B', admin);
    end if;
  end loop;

  -- lo que está en la mesa todos los días (estaciones): se cambian las del desayuno por las de Daniel
  delete from marea.platos where permanente and turno = 'desayuno' and pg_temp.n(nombre) not like 'cafe%';
  insert into marea.platos (nombre, descripcion, estilo, ingredientes, tags, permanente, turno, creado_por)
  select v.nombre, v.descripcion, v.estilo, v.ing, v.tags, true, 'desayuno', admin
  from (values
    ('Ceviche de camarón y pescado', 'Todos los días en el desayuno: ceviche de camarón y de pescado, con chifles y canguil.', 'Bol grande para todos',
     array['Camarón','Pescado fresco','Limón','Cebolla colorada','Tomate','Cilantro','Chifles','Canguil'], array['#Costeño','#Compartir']),
    ('Fruta picada: sandía, piña y papaya', 'Picada en la mañana y a la mano todo el día.', 'Para todo el día',
     array['Sandía','Piña','Papaya'], array['#Healthy']),
    ('Jugo de naranja colado', 'Recién exprimido y colado, para todos.', 'Natural',
     array['Naranja'], array['#ZeroAlcohol']),
    ('Jugo de coco', 'Agua y jugo de coco bien frío.', 'Natural',
     array['Coco'], array['#ZeroAlcohol']),
    ('Yogurt con arándanos', 'Yogurt natural con arándanos frescos.', 'Para servirse',
     array['Yogurt','Arándanos'], array['#Healthy'])
  ) as v(nombre, descripcion, estilo, ing, tags)
  where not exists (select 1 from marea.platos p where p.permanente and p.nombre = v.nombre);
end $$;

-- 2 · CARROS ---------------------------------------------------------------------------------
do $$
declare lexus uuid; amarok uuid; t text; x uuid;
begin
  select id into lexus from marea.vehiculos where pg_temp.n(nombre) like 'lexus%' order by created_at limit 1;
  select id into amarok from marea.vehiculos where pg_temp.n(nombre) like 'amarok%' order by created_at limit 1;
  if lexus is null or amarok is null then raise notice 'No están los dos carros: no se cambia nada'; return; end if;
  update marea.vehiculos set conductor = pg_temp.p('daniel'), nota = 'Maneja Daniel · van las chicas' where id = lexus;
  update marea.vehiculos set conductor = pg_temp.p('lenin'), nota = 'Maneja Lenin · van los chicos' where id = amarok;
  foreach t in array array['ida', 'regreso'] loop
    delete from marea.pasajeros where trayecto = t and persona_id in (pg_temp.p('daniel'), pg_temp.p('lenin'));   -- los conductores no ocupan puesto
    foreach x in array array[pg_temp.p('alegria'), pg_temp.p('domenika'), pg_temp.p('natalia'), pg_temp.p('ana paula')] loop
      if x is not null then insert into marea.pasajeros (vehiculo_id, persona_id, trayecto, maletas) values (lexus, x, t, 1)
        on conflict (persona_id, trayecto) do update set vehiculo_id = excluded.vehiculo_id; end if;
    end loop;
    foreach x in array array[pg_temp.p('kevin'), pg_temp.p('jhon'), pg_temp.p('esteban')] loop
      if x is not null then insert into marea.pasajeros (vehiculo_id, persona_id, trayecto, maletas) values (amarok, x, t, 1)
        on conflict (persona_id, trayecto) do update set vehiculo_id = excluded.vehiculo_id; end if;
    end loop;
  end loop;
  update marea.eventos set descripcion = 'Nos vemos 7:45 a.m. en la casa de la Ale en Cumbayá para salir puntuales a las 8:00. Dos carros: el Lexus (maneja Daniel, van las chicas) y la Amarok (maneja Lenin, van los chicos). Son unas 6 a 7 horas con la parada del almuerzo.'
   where titulo = 'Salida desde la casa de la Ale';
end $$;

-- 3 · GUÍA DE CADA LOOK ----------------------------------------------------------------------
create table if not exists look_guias (
  clave text primary key,                      -- el nombre del look (ej. 'Welcome White Night')
  descripcion text check (descripcion is null or length(descripcion) <= 1500),   -- lo que cuenta quien sube las fotos
  guia jsonb,                                  -- lo que arma la IA: titulo, resumen, colores, el, ella, tips
  actualizado_por uuid references personas(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table look_guias enable row level security;
grant select, insert, update on look_guias to authenticated;
drop policy if exists lg_sel on look_guias; create policy lg_sel on look_guias for select to authenticated using (mi_persona() is not null);
drop policy if exists lg_ins on look_guias; create policy lg_ins on look_guias for insert to authenticated with check (mi_persona() is not null);
drop policy if exists lg_upd on look_guias; create policy lg_upd on look_guias for update to authenticated using (mi_persona() is not null);
