-- Casablanca v51 · el viernes 9 tal como lo dictó Daniel, los carros sin dueño en el nombre,
-- la votación del almuerzo abierta (cada quien pone su opción) y las tablas de JUEGOS y KARAOKE.
--   08:00 Salida desde la casa de la Ale (Cumbayá)
--   ≈12:30 Almuerzo de camino (lo decide la votación de la app)
--   15:00 Llegada con ceviche (hora estimada)
--   15:45 Check-in y cuartos
--   16:30 Micheladas en la playa (+ paletas, spike ball, frisbee, fútbol, primer baño)
--   17:50 Atardecer y foto de grupo
--   20:00 Cena noche de estrellas y fogata
-- Idempotente. Solo esquema marea.
set search_path = marea, public;

do $$
declare admin uuid; d1 date; ev uuid;
begin
  select id into admin from marea.personas where rol = 'admin' and activo order by created_at limit 1;
  select coalesce((valor->>'desde')::date, date '2026-10-09') into d1 from marea.config where clave = 'viaje';

  -- 1 · la llegada pasa a ser «Llegada con ceviche» (se conserva su id, sus votos y su foto)
  update marea.eventos set titulo = 'Llegada con ceviche', tematica = 'Recepción', dia = d1, hora = '15:00', bloque = 'tarde', lugar = 'casa', estado = 'oficial',
    descripcion = 'Hora estimada de llegada: 3:00 p.m. En la casa nos recibe un ceviche de bienvenida bien frío. Primero comemos, después se desempaca.',
    lista = '[{"txt":"Ceviche y chifles","ok":false},{"txt":"Hielo","ok":false},{"txt":"Bajar la despensa del carro","ok":false}]'::jsonb
   where titulo = 'Llegada y check-in';
  insert into marea.eventos (titulo, tematica, descripcion, dia, bloque, hora, lugar, estado, lista, creado_por)
  select 'Llegada con ceviche', 'Recepción', 'Hora estimada de llegada: 3:00 p.m. En la casa nos recibe un ceviche de bienvenida bien frío. Primero comemos, después se desempaca.',
         d1, 'tarde', '15:00', 'casa', 'oficial', '[{"txt":"Ceviche y chifles","ok":false},{"txt":"Hielo","ok":false},{"txt":"Bajar la despensa del carro","ok":false}]'::jsonb, admin
  where not exists (select 1 from marea.eventos where titulo = 'Llegada con ceviche');

  -- 2 · la noche: «Cena noche de estrellas y fogata» (antes «Círculo de intenciones bajo las estrellas»; se conserva el look Welcome White Night)
  update marea.eventos set titulo = 'Cena noche de estrellas y fogata', tematica = 'Noche de estrellas', dia = d1, hora = '20:00', bloque = 'noche', lugar = 'playa', estado = 'oficial',
    descripcion = 'Cenamos bajo las estrellas y después bajamos a la fogata en la playa: mantas, malvaviscos, música suave y una ronda donde cada quien dice qué quiere llevarse de este viaje.',
    lista = '[{"txt":"Leña o carbón para la fogata","ok":false},{"txt":"Encendedor","ok":false},{"txt":"Mantas","ok":false},{"txt":"Malvaviscos y palitos","ok":false},{"txt":"Parlante con música suave","ok":false}]'::jsonb
   where titulo = 'Círculo de intenciones bajo las estrellas';
  insert into marea.eventos (titulo, tematica, descripcion, dia, bloque, hora, lugar, dress_code, estado, lista, creado_por)
  select 'Cena noche de estrellas y fogata', 'Noche de estrellas',
         'Cenamos bajo las estrellas y después bajamos a la fogata en la playa: mantas, malvaviscos, música suave y una ronda donde cada quien dice qué quiere llevarse de este viaje.',
         d1, 'noche', '20:00', 'playa', 'Welcome White Night', 'oficial',
         '[{"txt":"Leña o carbón para la fogata","ok":false},{"txt":"Encendedor","ok":false},{"txt":"Mantas","ok":false},{"txt":"Malvaviscos y palitos","ok":false},{"txt":"Parlante con música suave","ok":false}]'::jsonb, admin
  where not exists (select 1 from marea.eventos where titulo = 'Cena noche de estrellas y fogata');
  -- la cena del menú que colgaba de esa noche se llama igual
  select id into ev from marea.eventos where titulo = 'Cena noche de estrellas y fogata' limit 1;
  update marea.comidas set titulo = 'Cena noche de estrellas y fogata' where evento_id = ev and turno = 'cena';

  -- 3 · lo nuevo del viernes (no se duplica si se corre dos veces)
  insert into marea.eventos (titulo, tematica, descripcion, dia, bloque, hora, lugar, estado, lista, creado_por)
  select v.titulo, v.tematica, v.descripcion, d1, v.bloque, v.hora::time, v.lugar, 'oficial', v.lista::jsonb, admin
  from (values
    ('Salida desde la casa de la Ale', 'Salida',
     'Nos vemos 7:45 a.m. en la casa de la Ale en Cumbayá para salir puntuales a las 8:00. Dos carros: el Lexus (maneja Kevin) y la Amarok (maneja Lenin). Son unas 6 a 7 horas con la parada del almuerzo.',
     'manana', '08:00', 'Cumbayá · casa de la Ale',
     '[{"txt":"Cédula","ok":false},{"txt":"Traje de baño a la mano","ok":false},{"txt":"Bloqueador y gafas","ok":false},{"txt":"Cargador del celular","ok":false},{"txt":"Snacks y agua para el camino","ok":false}]'),
    ('Check-in y cuartos', 'Check-in',
     'Repartimos cuartos, bajamos maletas, guardamos la despensa en la cocina y las bebidas en los coolers. Ponte el traje de baño: la playa está a 10 gradas.',
     'tarde', '15:45', 'casa',
     '[{"txt":"Repartir cuartos","ok":false},{"txt":"Bebidas a los coolers","ok":false},{"txt":"WiFi de la casa","ok":false}]'),
    ('Micheladas en la playa', 'Tarde de playa',
     'Micheladas bien frías frente al mar y, para quien quiera: paletas, spike ball, frisbee, fútbol playero y el primer baño de mar. Las ideas de juegos están en la app, en Juegos.',
     'tarde', '16:30', 'playa',
     '[{"txt":"Cerveza bien fría","ok":false},{"txt":"Limón, sal y salsas","ok":false},{"txt":"Hielo","ok":false},{"txt":"Parlante","ok":false},{"txt":"Paletas, spike ball y frisbee","ok":false}]'),
    ('Atardecer y foto de grupo', 'Atardecer',
     'El sol se pone a eso de las 6:10 p.m. Todos a la orilla para la primera foto del grupo con el atardecer de Same.',
     'atardecer', '17:50', 'playa',
     '[{"txt":"Celular con batería","ok":false},{"txt":"Trípode","ok":false}]')
  ) as v(titulo, tematica, descripcion, bloque, hora, lugar, lista)
  where not exists (select 1 from marea.eventos e where e.titulo = v.titulo);

  -- 4 · votación del almuerzo: fuera las opciones que traía la app; la ponen los viajeros
  delete from marea.votos where evento_id in (select id from marea.eventos where tematica = 'Almuerzo de camino' and titulo in
    ('Directo al ceviche de la casa', 'Encocado en Esmeraldas', 'Mariscos frente al mar en Atacames', 'Almuerzo típico en la vía (La Concordia)'));
  delete from marea.eventos where tematica = 'Almuerzo de camino' and titulo in
    ('Directo al ceviche de la casa', 'Encocado en Esmeraldas', 'Mariscos frente al mar en Atacames', 'Almuerzo típico en la vía (La Concordia)');

  -- 5 · los carros se llaman por el carro, no por el dueño (quién maneja ya sale aparte)
  update marea.vehiculos set nombre = 'Lexus' where nombre = 'Lexus de Kevin';
  update marea.vehiculos set nombre = 'Amarok' where nombre = 'Amarok de Lenin';
  update marea.vehiculos set nota = 'Copiloto: Daniel' where nombre = 'Amarok' and coalesce(nota, '') not ilike '%copiloto%';
end $$;

-- ── JUEGOS: trivia tipo Kahoot y «¿quién es más probable que…?» ──────────────────────────
create table if not exists juegos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'trivia' check (tipo in ('trivia', 'probable')),
  titulo text,
  estado text not null default 'espera' check (estado in ('espera', 'pregunta', 'resultado', 'fin')),
  idx int not null default 0,
  preguntas jsonb not null default '[]'::jsonb,
  segundos int not null default 20 check (segundos between 5 and 120),
  host uuid references personas(id) on delete set null,
  creado_por uuid references personas(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists juego_respuestas (
  juego_id uuid not null references juegos(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  idx int not null,
  opcion int,                 -- trivia: la opción que tocó
  voto uuid,                  -- «¿quién es más probable?»: la persona votada
  ms int,
  puntos int not null default 0,
  created_at timestamptz not null default now(),
  primary key (juego_id, persona_id, idx)
);
-- ── KARAOKE: la fila de canciones (de iTunes) ────────────────────────────────────────────
create table if not exists karaoke (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id) on delete cascade,     -- quien la pidió
  cantantes uuid[] not null default '{}',
  titulo text not null check (length(titulo) <= 200),
  artista text,
  portada text,
  preview text,
  itunes_id bigint,
  estado text not null default 'fila' check (estado in ('fila', 'cantando', 'cantada', 'saltada')),
  orden double precision not null default extract(epoch from now()),
  created_at timestamptz not null default now()
);
create index if not exists karaoke_orden_ix on karaoke (estado, orden);
-- ── VOTOS de juegos (premios del karaoke, actividades de playa que más gustan) ─────────────
create table if not exists votos_juego (
  clave text not null,
  persona_id uuid not null references personas(id) on delete cascade,
  opcion text not null,
  created_at timestamptz not null default now(),
  primary key (clave, persona_id)
);

alter table juegos enable row level security;
alter table juego_respuestas enable row level security;
alter table karaoke enable row level security;
alter table votos_juego enable row level security;
grant select, insert, update, delete on juegos, juego_respuestas, karaoke, votos_juego to authenticated;

drop policy if exists jg_sel on juegos; create policy jg_sel on juegos for select to authenticated using (mi_persona() is not null);
drop policy if exists jg_ins on juegos; create policy jg_ins on juegos for insert to authenticated with check (creado_por = mi_persona());
drop policy if exists jg_upd on juegos; create policy jg_upd on juegos for update to authenticated using (mi_persona() is not null);
drop policy if exists jg_del on juegos; create policy jg_del on juegos for delete to authenticated using (creado_por = mi_persona() or es_admin());

drop policy if exists jr_sel on juego_respuestas; create policy jr_sel on juego_respuestas for select to authenticated using (mi_persona() is not null);
drop policy if exists jr_ins on juego_respuestas; create policy jr_ins on juego_respuestas for insert to authenticated with check (persona_id = mi_persona());
drop policy if exists jr_upd on juego_respuestas; create policy jr_upd on juego_respuestas for update to authenticated using (persona_id = mi_persona());
drop policy if exists jr_del on juego_respuestas; create policy jr_del on juego_respuestas for delete to authenticated using (persona_id = mi_persona() or es_admin());

drop policy if exists kk_sel on karaoke; create policy kk_sel on karaoke for select to authenticated using (mi_persona() is not null);
drop policy if exists kk_ins on karaoke; create policy kk_ins on karaoke for insert to authenticated with check (persona_id = mi_persona());
drop policy if exists kk_upd on karaoke; create policy kk_upd on karaoke for update to authenticated using (mi_persona() is not null);
drop policy if exists kk_del on karaoke; create policy kk_del on karaoke for delete to authenticated using (persona_id = mi_persona() or es_admin());

drop policy if exists vj_sel on votos_juego; create policy vj_sel on votos_juego for select to authenticated using (mi_persona() is not null);
drop policy if exists vj_ins on votos_juego; create policy vj_ins on votos_juego for insert to authenticated with check (persona_id = mi_persona());
drop policy if exists vj_upd on votos_juego; create policy vj_upd on votos_juego for update to authenticated using (persona_id = mi_persona());
drop policy if exists vj_del on votos_juego; create policy vj_del on votos_juego for delete to authenticated using (persona_id = mi_persona() or es_admin());
