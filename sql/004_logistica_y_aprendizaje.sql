-- ============================================================================
-- MAREA ALTA · 004 · equipo, carros, memoria de comercios, atardecer (idempotente)
-- Correr DESPUÉS de 001, 002 y 003 en el SQL editor de fieldbuilt-lab.
-- ============================================================================
set search_path = marea, public;

-- el día tiene cuatro momentos: mañana, tarde, atardecer, noche
alter table marea.eventos drop constraint if exists eventos_bloque_check;
alter table marea.eventos add constraint eventos_bloque_check check (bloque is null or bloque in ('manana','tarde','atardecer','noche'));

-- equipo: quién lleva qué (parlante, micrófonos, proyector, juegos, coolers, trípode…)
create table if not exists marea.equipo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null default 'otros',
  cantidad int not null default 1,
  responsable uuid references marea.personas(id) on delete set null,
  estado text not null default 'falta' check (estado in ('falta','confirmado','empacado','en_casa')),
  evento_id uuid references marea.eventos(id) on delete set null,
  nota text,
  creado_por uuid references marea.personas(id),
  created_at timestamptz not null default now()
);

-- carros y puestos (ida y regreso), con maletas
create table if not exists marea.vehiculos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  conductor uuid references marea.personas(id) on delete set null,
  puestos int not null default 5 check (puestos between 1 and 60),
  maletas int not null default 4 check (maletas between 0 and 60),
  salida text, nota text,
  creado_por uuid references marea.personas(id),
  created_at timestamptz not null default now()
);
create table if not exists marea.pasajeros (
  vehiculo_id uuid not null references marea.vehiculos(id) on delete cascade,
  persona_id uuid not null references marea.personas(id) on delete cascade,
  trayecto text not null check (trayecto in ('ida','regreso')),
  maletas int not null default 1 check (maletas between 0 and 10),
  primary key (persona_id, trayecto)
);

-- memoria por comercio (como AERO aprende por proveedor): la próxima factura del mismo
-- RUC o nombre ya llega con su categoría, alcance y etiquetas
create table if not exists marea.comercios (
  clave text primary key,          -- 'ruc:1790016919001' o 'n:supermaxi same'
  nombre text, ruc text,
  categoria text, alcance text, etiquetas text[] not null default '{}',
  veces int not null default 1,
  updated_at timestamptz not null default now()
);

alter table marea.equipo    enable row level security;
alter table marea.vehiculos enable row level security;
alter table marea.pasajeros enable row level security;
alter table marea.comercios enable row level security;

-- equipo: colaborativo; borra quien lo creó o el admin
drop policy if exists eq_sel on marea.equipo; create policy eq_sel on marea.equipo for select to authenticated using (marea.mi_persona() is not null);
drop policy if exists eq_ins on marea.equipo; create policy eq_ins on marea.equipo for insert to authenticated with check (creado_por = marea.mi_persona() or marea.es_admin());
drop policy if exists eq_upd on marea.equipo; create policy eq_upd on marea.equipo for update to authenticated using (marea.mi_persona() is not null);
drop policy if exists eq_del on marea.equipo; create policy eq_del on marea.equipo for delete to authenticated using (creado_por = marea.mi_persona() or marea.es_admin());
-- carros: los edita quien los creó, su conductor o el admin
drop policy if exists vh_sel on marea.vehiculos; create policy vh_sel on marea.vehiculos for select to authenticated using (marea.mi_persona() is not null);
drop policy if exists vh_ins on marea.vehiculos; create policy vh_ins on marea.vehiculos for insert to authenticated with check (creado_por = marea.mi_persona() or marea.es_admin());
drop policy if exists vh_upd on marea.vehiculos; create policy vh_upd on marea.vehiculos for update to authenticated using (creado_por = marea.mi_persona() or conductor = marea.mi_persona() or marea.es_admin());
drop policy if exists vh_del on marea.vehiculos; create policy vh_del on marea.vehiculos for delete to authenticated using (creado_por = marea.mi_persona() or marea.es_admin());
-- puestos: cada quien se sube o se baja a sí mismo; el conductor y el admin acomodan a otros
drop policy if exists pa_sel on marea.pasajeros; create policy pa_sel on marea.pasajeros for select to authenticated using (marea.mi_persona() is not null);
drop policy if exists pa_ins on marea.pasajeros; create policy pa_ins on marea.pasajeros for insert to authenticated with check (persona_id = marea.mi_persona() or marea.es_admin() or exists (select 1 from marea.vehiculos v where v.id = vehiculo_id and v.conductor = marea.mi_persona()));
drop policy if exists pa_upd on marea.pasajeros; create policy pa_upd on marea.pasajeros for update to authenticated using (persona_id = marea.mi_persona() or marea.es_admin() or exists (select 1 from marea.vehiculos v where v.id = vehiculo_id and v.conductor = marea.mi_persona()));
drop policy if exists pa_del on marea.pasajeros; create policy pa_del on marea.pasajeros for delete to authenticated using (persona_id = marea.mi_persona() or marea.es_admin() or exists (select 1 from marea.vehiculos v where v.id = vehiculo_id and v.conductor = marea.mi_persona()));
-- comercios: todos leen y enseñan (es una memoria compartida del grupo)
drop policy if exists cm_sel on marea.comercios; create policy cm_sel on marea.comercios for select to authenticated using (marea.mi_persona() is not null);
drop policy if exists cm_ins on marea.comercios; create policy cm_ins on marea.comercios for insert to authenticated with check (marea.mi_persona() is not null);
drop policy if exists cm_upd on marea.comercios; create policy cm_upd on marea.comercios for update to authenticated using (marea.mi_persona() is not null);

-- un carro no puede llevar más gente de la que cabe
create or replace function marea.pasajeros_cupo_tg() returns trigger
language plpgsql security definer set search_path = marea, public as $$
declare cap int; usados int;
begin
  select puestos into cap from marea.vehiculos where id = new.vehiculo_id;
  select count(*) into usados from marea.pasajeros where vehiculo_id = new.vehiculo_id and trayecto = new.trayecto and persona_id <> new.persona_id;
  if usados + 1 > cap then raise exception 'Ese carro ya está lleno'; end if;
  return new;
end $$;
drop trigger if exists pasajeros_cupo on marea.pasajeros;
create trigger pasajeros_cupo before insert or update on marea.pasajeros for each row execute function marea.pasajeros_cupo_tg();

-- presupuesto: equipos y trípodes
insert into marea.presupuesto (nombre, categoria, minimo, maximo, tipo, nota, orden)
select 'Equipos y trípodes','logistica',null,null,'variable','Por definir',5
where not exists (select 1 from marea.presupuesto where nombre = 'Equipos y trípodes');

-- itinerario de Same: llegada, karaoke + talent show juntos, atardeceres
insert into marea.eventos (titulo, tematica, descripcion, bloque, hora, lugar, dress_code, estilo, estado)
select v.titulo, v.tematica, v.descripcion, v.bloque, v.hora::time, v.lugar, v.dress_code, v.estilo::jsonb, 'propuesta'
from (values
 ('Llegada y check-in','Llegada','Llegamos, repartimos cuartos, guardamos la despensa en los coolers y conocemos la casa.','tarde','15:00','casa','',null),
 ('Karaoke y Talent Show','Karaoke y talentos','Proyector y dos micrófonos. Primero el karaoke, una canción obligatoria por persona; luego el show con el talento que cada quien anotó en su ficha.','noche','21:00','sala','Brillos y neón',
  '{"nombre":"Brillos y neón","descripcion":"Lentejuelas, colores eléctricos y algo que brille con el proyector.","paleta":["#C13CFF","#FF3CAC","#2B5BFF","#141414"],"ideas":["Lentejuelas","Gafas de colores","Pulseras de neón"]}'),
 ('Spike ball, red y paletas de playa','Juegos de playa','Red, pelota, paletas y spike ball. Parejas sorteadas y eliminación directa.','tarde','16:00','playa','Color del equipo',null)
) as v(titulo,tematica,descripcion,bloque,hora,lugar,dress_code,estilo)
where not exists (select 1 from marea.eventos e where e.titulo = v.titulo);
update marea.eventos set bloque='atardecer', hora='17:30', tematica='Parrillada al atardecer',
  estilo = jsonb_set(coalesce(estilo,'{}'::jsonb),'{nombre}','"Noche Tropical / Chicas"')
  where titulo='Taco & Sunset Grill Night' and estado='propuesta';
update marea.eventos set tematica='Bienvenida', hora='21:30', descripcion='Después de la cena ligera costeña: fogata, mantas y una ronda de intenciones para abrir el viaje.'
  where titulo='Círculo de intenciones bajo las estrellas' and estado='propuesta';
update marea.eventos set bloque='atardecer', hora='17:00', dress_code='Adventure Meets Caribbean Chic',
  estilo='{"nombre":"Adventure Meets Caribbean Chic","descripcion":"Estética mediterránea para la producción de fotos: blanco impecable, tonos Santorini y un toque de aventura (sombrero, lino, cuero natural).","paleta":["#FFFFFF","#E9E2D3","#2F6DB5","#B98B4E"],"ideas":["Blanco impecable","Lino y algodón","Sombrero","Gafas de sol","Cuero natural"]}'::jsonb
  where titulo='Sesión de fotos con gafas de sol' and estado='propuesta';
delete from marea.eventos e where e.estado='propuesta' and e.titulo in ('Karaoke con proyector','Talent Show','Spike ball y paletas de playa')
  and not exists (select 1 from marea.votos v where v.evento_id=e.id) and not exists (select 1 from marea.tareas t where t.evento_id=e.id);
