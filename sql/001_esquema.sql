-- ============================================================================
-- MAREA ALTA · esquema v1 (idempotente: seguro de correr dos veces)
-- Vive en el proyecto Supabase COMPARTIDO `fieldbuilt-lab`, dentro del esquema
-- propio `marea` (varias apps comparten el proyecto: NADA de Marea va en public).
-- Pegar completo en el SQL editor. Si una transacción queda abortada: ROLLBACK; y repetir.
-- Después de correrlo: Project Settings → Data API → Exposed schemas → agregar `marea`.
-- ============================================================================
create schema if not exists marea;
grant usage on schema marea to authenticated, anon, service_role;
alter default privileges in schema marea grant all on tables to authenticated, service_role;
alter default privileges in schema marea grant all on sequences to authenticated, service_role;
alter default privileges in schema marea grant execute on functions to authenticated, service_role;
set search_path = marea, public;

-- ---------- 1. tablas --------------------------------------------------------
create table if not exists personas (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users(id) on delete set null,
  cedula text unique not null,
  nombre text not null,
  apodo text,
  telefono text,                         -- solo para el botón de WhatsApp del admin
  rol text not null default 'invitado' check (rol in ('admin','invitado')),
  activo boolean not null default true,
  perfil jsonb not null default '{}'::jsonb,
  -- perfil: {foto, cumple, ciudad, alergias, bebida, cancion, juego, talla, superpoder, bio}
  emergencia jsonb,                      -- {nombre, telefono, parentesco} — SOLO admin
  created_at timestamptz not null default now()
);
-- NO existe columna pin. La contraseña vive en Auth. Nunca agregarla.

create table if not exists config (
  clave text primary key,
  valor jsonb not null
);
insert into config(clave, valor) values
  ('viaje', '{"nombre":"Marea Alta","lugar":"","desde":null,"hasta":null,"moneda":"USD"}'::jsonb)
on conflict (clave) do nothing;

create table if not exists etiquetas (
  id serial primary key,
  nombre text unique not null,
  color text
);

create table if not exists eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tematica text,
  descripcion text,
  dia date,
  bloque text check (bloque in ('manana','tarde','noche')),
  hora time,
  lugar text,
  dress_code text,
  playlist_url text,
  estado text not null default 'propuesta' check (estado in ('propuesta','oficial','hecho','cancelado')),
  anfitriones uuid[] not null default '{}',
  etiquetas int[] not null default '{}',
  lista jsonb not null default '[]'::jsonb,     -- [{txt, ok, tarea_id}] lo que hay que llevar/comprar
  creado_por uuid references personas(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists votos (
  evento_id uuid references eventos(id) on delete cascade,
  persona_id uuid references personas(id) on delete cascade,
  valor smallint not null default 1 check (valor in (1)),
  created_at timestamptz not null default now(),
  primary key (evento_id, persona_id)
);

create table if not exists tareas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  detalle text,
  grupo text,                                   -- Comida·Bebidas·Logística·Casa·Actividades·Compras·Turnos
  estado text not null default 'por_hacer' check (estado in ('por_hacer','en_curso','listo')),
  responsable uuid references personas(id),
  evento_id uuid references eventos(id) on delete set null,
  fecha date,
  etiquetas int[] not null default '{}',
  subtareas jsonb not null default '[]'::jsonb, -- [{txt, ok}]
  creado_por uuid references personas(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gastos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'gasto' check (tipo in ('gasto','pago','aporte')),
  descripcion text not null,
  monto numeric(12,2) not null check (monto >= 0),
  moneda text not null default 'USD',
  fecha date not null default current_date,
  categoria text,                               -- comida·bebidas·hospedaje·transporte·actividades·mercado·otros
  evento_id uuid references eventos(id) on delete set null,
  etiquetas int[] not null default '{}',
  fondo boolean not null default false,         -- true = lo pagó el fondo común (NO entra a balances)
  pagadores jsonb not null default '[]'::jsonb, -- [{persona_id, monto}]  suma = monto (vacío si fondo)
  reparto jsonb not null default '{"modo":"igual","partes":[]}'::jsonb,
  -- reparto.modo: igual | porcentaje | monto ; reparto.partes: [{persona_id, valor}]
  --   igual      → valor se ignora, monto/n
  --   porcentaje → valor en %, deben sumar 100
  --   monto      → valor en dinero, deben sumar monto
  respaldo_path text,                           -- storage marea-respaldos/<persona_id>/<uuid>.jpg
  origen text check (origen in ('texto','foto','manual')),
  lectura_ia jsonb,                             -- lo que propuso el modelo (auditoría)
  nota text,
  creado_por uuid references personas(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  eliminado boolean not null default false
);
create index if not exists gastos_fecha_idx on gastos(fecha) where not eliminado;
create index if not exists gastos_evento_idx on gastos(evento_id);

create table if not exists gastos_historial (   -- insert-only (lo escribe un trigger)
  id bigserial primary key,
  gasto_id uuid not null,
  version jsonb not null,
  cambiado_por uuid,
  ts timestamptz not null default now()
);

create table if not exists entradas (           -- lo que la gente manda antes de confirmarlo
  id uuid primary key default gen_random_uuid(),
  persona_id uuid references personas(id),
  texto text,
  archivo_path text,
  propuesta jsonb,
  estado text not null default 'pendiente' check (estado in ('pendiente','confirmada','descartada')),
  created_at timestamptz not null default now()
);

create table if not exists muro (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid references personas(id),
  foto_path text,
  texto text,
  dia date default current_date,
  created_at timestamptz not null default now()
);

create table if not exists admin_audit (
  id bigserial primary key,
  actor text, accion text, objetivo text, detalle jsonb,
  ts timestamptz not null default now()
);

-- ---------- 2. columnas defensivas (create table if not exists NO agrega columnas) ----
alter table personas add column if not exists telefono text;
alter table gastos   add column if not exists fondo boolean not null default false;
alter table gastos   add column if not exists nota text;
alter table eventos  add column if not exists lista jsonb not null default '[]'::jsonb;

-- ---------- 2b. helpers de identidad (después de las tablas: SQL las valida al crear) ----
create or replace function marea.mi_persona() returns uuid
language sql stable security definer set search_path = marea, public as $$
  select id from personas where auth_id = auth.uid() and activo limit 1
$$;

create or replace function marea.es_admin() returns boolean
language sql stable security definer set search_path = marea, public as $$
  select exists(select 1 from personas where auth_id = auth.uid() and activo and rol = 'admin')
$$;

-- ---------- 3. historial de gastos (trigger) ---------------------------------
create or replace function marea.gastos_historial_tg() returns trigger
language plpgsql security definer set search_path = marea, public as $$
begin
  insert into gastos_historial(gasto_id, version, cambiado_por)
  values (old.id, to_jsonb(old), mi_persona());
  if tg_op = 'UPDATE' then new.updated_at = now(); return new; end if;
  return old;
end $$;
drop trigger if exists gastos_historial_trg on gastos;
create trigger gastos_historial_trg before update or delete on gastos
  for each row execute function gastos_historial_tg();

create or replace function marea.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists tareas_touch on tareas;
create trigger tareas_touch before update on tareas for each row execute function touch_updated_at();
drop trigger if exists eventos_touch on eventos;
create trigger eventos_touch before update on eventos for each row execute function touch_updated_at();

-- ---------- 4. vistas --------------------------------------------------------
-- Lo que TODOS pueden ver de los demás: sin cédula, sin emergencia, sin teléfono.
create or replace view personas_publicas as
  select id, nombre, apodo, rol, activo,
         perfil - 'bio_privada' as perfil
  from personas;
-- (la vista corre como su dueño → salta la RLS de personas a propósito)
grant select on personas_publicas to authenticated;

-- Cuánto le toca a cada persona en cada gasto (desglose del reparto)
create or replace view vw_gasto_partes as
with g as (
  select id, monto, reparto->>'modo' as modo, reparto->'partes' as partes
  from gastos where not eliminado and not fondo
),
p as (
  select g.id as gasto_id, g.monto, g.modo,
         (x->>'persona_id')::uuid as persona_id,
         coalesce((x->>'valor')::numeric, 0) as valor,
         count(*) over (partition by g.id) as n
  from g, jsonb_array_elements(g.partes) x
)
select gasto_id, persona_id,
  round(case modo
    when 'igual'      then monto / n
    when 'porcentaje' then monto * valor / 100
    when 'monto'      then valor
  end, 2) as le_toca
from p;
grant select on vw_gasto_partes to authenticated;

-- Balance por persona: pagó − le toca = saldo (positivo = le deben)
create or replace view vw_balances as
with pag as (
  select (x->>'persona_id')::uuid as persona_id, sum((x->>'monto')::numeric) as pagado
  from gastos g, jsonb_array_elements(g.pagadores) x
  where not g.eliminado and not g.fondo
  group by 1
),
deb as (
  select persona_id, sum(le_toca) as le_toca from vw_gasto_partes group by 1
)
select pp.id as persona_id, pp.nombre, pp.apodo,
       coalesce(pag.pagado, 0) as pagado,
       coalesce(deb.le_toca, 0) as le_toca,
       round(coalesce(pag.pagado, 0) - coalesce(deb.le_toca, 0), 2) as saldo
from personas_publicas pp
left join pag on pag.persona_id = pp.id
left join deb on deb.persona_id = pp.id
where pp.activo;
grant select on vw_balances to authenticated;

-- Fondo común: aportes − lo pagado por el fondo
create or replace view vw_fondo as
select
  coalesce((select sum(monto) from gastos where tipo='aporte' and not eliminado), 0) as aportado,
  coalesce((select sum(monto) from gastos where fondo and not eliminado), 0) as gastado,
  coalesce((select sum(monto) from gastos where tipo='aporte' and not eliminado), 0)
  - coalesce((select sum(monto) from gastos where fondo and not eliminado), 0) as disponible;
grant select on vw_fondo to authenticated;

-- ---------- 5. RLS -----------------------------------------------------------
alter table personas         enable row level security;
alter table config           enable row level security;
alter table etiquetas        enable row level security;
alter table eventos          enable row level security;
alter table votos            enable row level security;
alter table tareas           enable row level security;
alter table gastos           enable row level security;
alter table gastos_historial enable row level security;
alter table entradas         enable row level security;
alter table muro             enable row level security;
alter table admin_audit      enable row level security;

-- personas: cada quien su fila completa; el admin todas. Los demás usan personas_publicas.
drop policy if exists personas_sel on personas;
create policy personas_sel on personas for select to authenticated
  using (auth_id = auth.uid() or es_admin());
drop policy if exists personas_upd on personas;
create policy personas_upd on personas for update to authenticated
  using (auth_id = auth.uid() or es_admin())
  with check (auth_id = auth.uid() or es_admin());
-- Un invitado solo puede tocar perfil/apodo/telefono de SU fila. Se protege con trigger
-- (no con subconsultas en la policy: Postgres las rechaza por "infinite recursion").
create or replace function marea.personas_guard_tg() returns trigger
language plpgsql security definer set search_path = marea, public as $$
begin
  if not es_admin() then
    if new.rol is distinct from old.rol or new.cedula is distinct from old.cedula
       or new.activo is distinct from old.activo or new.auth_id is distinct from old.auth_id
       or new.nombre is distinct from old.nombre or new.emergencia is distinct from old.emergencia then
      raise exception 'solo el admin puede cambiar ese campo';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists personas_guard on personas;
create trigger personas_guard before update on personas for each row execute function personas_guard_tg();
-- insert/delete de personas: solo la Edge Function (service role). Sin policy = nadie desde el front.

-- config: todos leen, admin escribe
drop policy if exists config_sel on config;  create policy config_sel on config for select to authenticated using (true);
drop policy if exists config_adm on config;  create policy config_adm on config for all to authenticated using (es_admin()) with check (es_admin());

-- etiquetas: todos leen y crean; borra el admin
drop policy if exists etq_sel on etiquetas; create policy etq_sel on etiquetas for select to authenticated using (true);
drop policy if exists etq_ins on etiquetas; create policy etq_ins on etiquetas for insert to authenticated with check (mi_persona() is not null);
drop policy if exists etq_del on etiquetas; create policy etq_del on etiquetas for delete to authenticated using (es_admin());

-- patrón "mío o admin" para eventos, tareas, gastos, entradas, muro
drop policy if exists ev_sel on eventos; create policy ev_sel on eventos for select to authenticated using (true);
drop policy if exists ev_ins on eventos; create policy ev_ins on eventos for insert to authenticated with check (creado_por = mi_persona());
drop policy if exists ev_upd on eventos; create policy ev_upd on eventos for update to authenticated
  using (creado_por = mi_persona() or mi_persona() = any(anfitriones) or es_admin());
drop policy if exists ev_del on eventos; create policy ev_del on eventos for delete to authenticated using (es_admin());

drop policy if exists vt_sel on votos; create policy vt_sel on votos for select to authenticated using (true);
drop policy if exists vt_ins on votos; create policy vt_ins on votos for insert to authenticated with check (persona_id = mi_persona());
drop policy if exists vt_del on votos; create policy vt_del on votos for delete to authenticated using (persona_id = mi_persona() or es_admin());

drop policy if exists ta_sel on tareas; create policy ta_sel on tareas for select to authenticated using (true);
drop policy if exists ta_ins on tareas; create policy ta_ins on tareas for insert to authenticated with check (creado_por = mi_persona());
-- cualquiera puede TOMAR una tarea o marcarla lista (es colaborativo); borrar solo admin
drop policy if exists ta_upd on tareas; create policy ta_upd on tareas for update to authenticated using (mi_persona() is not null);
drop policy if exists ta_del on tareas; create policy ta_del on tareas for delete to authenticated using (creado_por = mi_persona() or es_admin());

drop policy if exists ga_sel on gastos; create policy ga_sel on gastos for select to authenticated using (true);
drop policy if exists ga_ins on gastos; create policy ga_ins on gastos for insert to authenticated with check (creado_por = mi_persona());
drop policy if exists ga_upd on gastos; create policy ga_upd on gastos for update to authenticated
  using (creado_por = mi_persona() or es_admin());
-- no hay delete: se marca eliminado=true (soft-delete) y el trigger guarda la versión
drop policy if exists gh_sel on gastos_historial; create policy gh_sel on gastos_historial for select to authenticated using (true);

drop policy if exists en_sel on entradas; create policy en_sel on entradas for select to authenticated using (persona_id = mi_persona() or es_admin());
drop policy if exists en_ins on entradas; create policy en_ins on entradas for insert to authenticated with check (persona_id = mi_persona());
drop policy if exists en_upd on entradas; create policy en_upd on entradas for update to authenticated using (persona_id = mi_persona() or es_admin());

drop policy if exists mu_sel on muro; create policy mu_sel on muro for select to authenticated using (true);
drop policy if exists mu_ins on muro; create policy mu_ins on muro for insert to authenticated with check (persona_id = mi_persona());
drop policy if exists mu_del on muro; create policy mu_del on muro for delete to authenticated using (persona_id = mi_persona() or es_admin());

drop policy if exists au_sel on admin_audit; create policy au_sel on admin_audit for select to authenticated using (es_admin());

-- ---------- 6. storage -------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('marea-respaldos', 'marea-respaldos', false),
  ('marea-perfiles',  'marea-perfiles',  false),
  ('marea-muro',      'marea-muro',      false)
on conflict (id) do nothing;

-- leer: cualquier autenticado (URL firmada desde el front); subir: a su propia carpeta <persona_id>/...
drop policy if exists marea_st_sel on storage.objects;
create policy marea_st_sel on storage.objects for select to authenticated
  using (bucket_id in ('marea-respaldos','marea-perfiles','marea-muro'));
drop policy if exists marea_st_ins on storage.objects;
create policy marea_st_ins on storage.objects for insert to authenticated
  with check (bucket_id in ('marea-respaldos','marea-perfiles','marea-muro')
              and (storage.foldername(name))[1] = marea.mi_persona()::text);
drop policy if exists marea_st_del on storage.objects;
create policy marea_st_del on storage.objects for delete to authenticated
  using (bucket_id in ('marea-respaldos','marea-perfiles','marea-muro')
         and ((storage.foldername(name))[1] = marea.mi_persona()::text or marea.es_admin()));

-- ---------- 7. semilla de etiquetas y propuestas de noches temáticas ----------
insert into etiquetas(nombre, color) values
  ('bienvenida','#FF6B57'),('karaoke','#8E44AD'),('juegos','#1B7F8C'),('parrillada','#C0392B'),
  ('playa','#F1C40F'),('desayuno','#E67E22'),('fiesta','#E91E63'),('mercado','#27AE60'),('turnos','#7F8C8D')
on conflict (nombre) do nothing;

insert into eventos (titulo, tematica, descripcion, bloque, lugar, dress_code, estado)
select * from (values
 ('Taquiza del mar', 'Bienvenida', 'Tacos de camarón, pescado apanado y pulpo; barra de salsas; micheladas. Rompehielo: "dos verdades y una mentira" del viaje.', 'noche', 'casa', 'Camisa hawaiana o vestido florido', 'propuesta'),
 ('Karaoke · Grandes éxitos', 'Karaoke', 'Cada quien trae UNA canción obligatoria (la de su perfil). Rondas: solos → duetos sorteados → balada de todos. Se corona rey/reina por votación.', 'noche', 'casa', 'Brillos', 'propuesta'),
 ('Casino sin plata', 'Juegos de mesa', 'Mesas paralelas: Monopolio, Risk (arranca temprano o no termina) y mesa rápida (UNO, Jenga, Dixit). Tabla de posiciones en la app.', 'noche', 'casa', 'Pijama elegante', 'propuesta'),
 ('Asado de los Villalba', 'Parrillada', 'Carnes, choripanes, maduros, ensaladas. Cocinan los que marcaron "cocino" en su perfil. Playlist colaborativa.', 'noche', 'terraza', 'Delantal obligatorio para los anfitriones', 'propuesta'),
 ('Noche blanca', 'White party', 'Todos de blanco en la playa, luces, fogata si se permite y el cóctel oficial del viaje (nombre por votación).', 'noche', 'playa', 'Todo blanco', 'propuesta'),
 ('Throwback 2000s', 'Década', 'Ropa de la época, reguetón viejo y pop, trivia de la década con puntos en la app.', 'noche', 'casa', 'Y2K', 'propuesta'),
 ('Cine bajo las estrellas', 'Cine', 'Proyector o tele afuera, canguil, mantas; película elegida por votación.', 'noche', 'terraza', 'Cobija', 'propuesta'),
 ('Cada quien su cóctel', 'Mixología', 'Por parejas sorteadas, cada pareja inventa un cóctel; jurado popular.', 'noche', 'casa', 'Libre', 'propuesta'),
 ('Mystery menu', 'Cena a ciegas', 'Dos personas cocinan un menú sorpresa con lo que sobre; los demás adivinan ingredientes. Ideal para la última noche.', 'noche', 'casa', 'Libre', 'propuesta'),
 ('Playa''s Got Talent', 'Talentos', '3 minutos por persona o grupo; vale todo.', 'noche', 'casa', 'De gala playera', 'propuesta'),
 ('Olimpiadas de playa', 'Deporte', 'Equipos sorteados: vóley, fútbol-tenis, carrera de sacos, relevos con baldes, castillo de arena con jurado. Tabla de medallas.', 'tarde', 'playa', 'Color del equipo', 'propuesta'),
 ('Búsqueda del tesoro', 'Juego', 'Pistas en QR escondidas por la casa y la playa.', 'tarde', 'playa', 'Libre', 'propuesta'),
 ('Reto Chopped', 'Cocina', 'Tres canastas sorpresa del mercado local; equipos cocinan contra reloj.', 'tarde', 'casa', 'Libre', 'propuesta'),
 ('Pancakes bar', 'Desayuno', 'Pancakes con barra de toppings. Lo preparan dos personas por turno.', 'manana', 'casa', 'Pijama', 'propuesta'),
 ('Brunch de frutas y smoothies', 'Desayuno', 'Para el día después de la noche larga.', 'manana', 'casa', 'Pijama', 'propuesta'),
 ('Yoga al amanecer', 'Bienestar', 'Para los que madrugan. Opcional caminata por la orilla.', 'manana', 'playa', 'Deportiva', 'propuesta')
) as v(titulo, tematica, descripcion, bloque, lugar, dress_code, estado)
where not exists (select 1 from eventos e where e.titulo = v.titulo);

-- ---------- 8. verificación rápida -------------------------------------------
-- select tablename, rowsecurity from pg_tables where schemaname='marea' order by 1;
-- select * from vw_balances;  select * from vw_fondo;
