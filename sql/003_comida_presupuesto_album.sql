-- ============================================================================
-- MAREA ALTA · 003 · comida, presupuesto, dress code, álbum (idempotente)
-- Correr DESPUÉS de 001 y 002, en el SQL editor de fieldbuilt-lab.
-- Sin este archivo la app funciona igual, pero sin carta de comida ni presupuesto.
-- ============================================================================
set search_path = marea, public;

-- columnas nuevas en tablas existentes
alter table marea.gastos  add column if not exists alcance text;
alter table marea.gastos  add column if not exists factura jsonb;          -- comercio, RUC, ítems, IVA, propina, total
alter table marea.tareas  add column if not exists prioridad text not null default 'media';
alter table marea.eventos add column if not exists estilo jsonb;           -- dress code: nombre, descripción, paleta, ideas
alter table marea.muro    add column if not exists evento_id uuid references marea.eventos(id) on delete set null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='gastos_alcance_chk') then
    alter table marea.gastos add constraint gastos_alcance_chk check (alcance is null or alcance in ('fijo','consumo'));
  end if;
  if not exists (select 1 from pg_constraint where conname='tareas_prioridad_chk') then
    alter table marea.tareas add constraint tareas_prioridad_chk check (prioridad in ('alta','media','baja'));
  end if;
end $$;

-- una comida = un turno de un día (desayuno dual, almuerzo de la cocinera, cena colaborativa)
create table if not exists marea.comidas (
  id uuid primary key default gen_random_uuid(),
  dia date not null,
  turno text not null check (turno in ('desayuno','almuerzo','cena')),
  titulo text not null,
  modalidad text not null default 'colaborativa' check (modalidad in ('dual','cocinera','colaborativa','libre')),
  hora time,
  responsables uuid[] not null default '{}',
  evento_id uuid references marea.eventos(id) on delete set null,
  notas text,
  creado_por uuid references marea.personas(id),
  created_at timestamptz not null default now()
);
create index if not exists comidas_dia_idx on marea.comidas(dia);

-- un plato pertenece a una comida, o es "de todos los días" (permanente: café, fruta, ceviche bar)
create table if not exists marea.platos (
  id uuid primary key default gen_random_uuid(),
  comida_id uuid references marea.comidas(id) on delete cascade,
  nombre text not null,
  descripcion text,
  estilo text,
  ingredientes text[] not null default '{}',
  porciones int,
  tags text[] not null default '{}',
  alergenos text[] not null default '{}',   -- vacío = la app los detecta por ingredientes
  opcion text check (opcion is null or opcion in ('A','B')),
  foto text,
  permanente boolean not null default false,
  turno text check (turno is null or turno in ('desayuno','almuerzo','cena')),
  creado_por uuid references marea.personas(id),
  created_at timestamptz not null default now()
);
create index if not exists platos_comida_idx on marea.platos(comida_id);

-- quién va a cada comida, qué opción eligió y su pedido especial
create table if not exists marea.asistencia (
  comida_id uuid references marea.comidas(id) on delete cascade,
  persona_id uuid references marea.personas(id) on delete cascade,
  va boolean not null default true,
  opcion text check (opcion is null or opcion in ('A','B')),
  variante text,
  updated_at timestamptz not null default now(),
  primary key (comida_id, persona_id)
);

create table if not exists marea.presupuesto (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null,
  minimo numeric(12,2),
  maximo numeric(12,2),
  tipo text not null default 'fijo' check (tipo in ('fijo','variable')),
  nota text,
  orden int not null default 0
);

create table if not exists marea.inspiracion (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid references marea.eventos(id) on delete cascade,
  persona_id uuid references marea.personas(id),
  foto text not null,
  nota text,
  created_at timestamptz not null default now()
);

-- RLS: todos los del viaje leen; la comida es colaborativa; el presupuesto lo toca el admin
alter table marea.comidas     enable row level security;
alter table marea.platos      enable row level security;
alter table marea.asistencia  enable row level security;
alter table marea.presupuesto enable row level security;
alter table marea.inspiracion enable row level security;

drop policy if exists co_sel on marea.comidas;  create policy co_sel on marea.comidas for select to authenticated using (marea.mi_persona() is not null);
drop policy if exists co_ins on marea.comidas;  create policy co_ins on marea.comidas for insert to authenticated with check (marea.es_admin());
drop policy if exists co_upd on marea.comidas;  create policy co_upd on marea.comidas for update to authenticated using (marea.es_admin() or marea.mi_persona() = any(responsables));
drop policy if exists co_del on marea.comidas;  create policy co_del on marea.comidas for delete to authenticated using (marea.es_admin());

drop policy if exists pl_sel on marea.platos;   create policy pl_sel on marea.platos for select to authenticated using (marea.mi_persona() is not null);
drop policy if exists pl_ins on marea.platos;   create policy pl_ins on marea.platos for insert to authenticated with check (creado_por = marea.mi_persona() or marea.es_admin());
drop policy if exists pl_upd on marea.platos;   create policy pl_upd on marea.platos for update to authenticated using (marea.mi_persona() is not null);
drop policy if exists pl_del on marea.platos;   create policy pl_del on marea.platos for delete to authenticated using (creado_por = marea.mi_persona() or marea.es_admin());

drop policy if exists as_sel on marea.asistencia; create policy as_sel on marea.asistencia for select to authenticated using (marea.mi_persona() is not null);
drop policy if exists as_ins on marea.asistencia; create policy as_ins on marea.asistencia for insert to authenticated with check (persona_id = marea.mi_persona());
drop policy if exists as_upd on marea.asistencia; create policy as_upd on marea.asistencia for update to authenticated using (persona_id = marea.mi_persona()) with check (persona_id = marea.mi_persona());
drop policy if exists as_del on marea.asistencia; create policy as_del on marea.asistencia for delete to authenticated using (persona_id = marea.mi_persona() or marea.es_admin());

drop policy if exists pr_sel on marea.presupuesto; create policy pr_sel on marea.presupuesto for select to authenticated using (marea.mi_persona() is not null);
drop policy if exists pr_adm on marea.presupuesto; create policy pr_adm on marea.presupuesto for all to authenticated using (marea.es_admin()) with check (marea.es_admin());

drop policy if exists in_sel on marea.inspiracion; create policy in_sel on marea.inspiracion for select to authenticated using (marea.mi_persona() is not null);
drop policy if exists in_ins on marea.inspiracion; create policy in_ins on marea.inspiracion for insert to authenticated with check (persona_id = marea.mi_persona());
drop policy if exists in_del on marea.inspiracion; create policy in_del on marea.inspiracion for delete to authenticated using (persona_id = marea.mi_persona() or marea.es_admin());

-- presupuesto inicial (cifras que dio Daniel; la cocinera y el bar quedan por definir)
insert into marea.presupuesto (nombre, categoria, minimo, maximo, tipo, nota, orden)
select * from (values
  ('Alquiler de la casa','hospedaje',1300::numeric,1500::numeric,'fijo','',1),
  ('Compras iniciales de despensa','despensa',700::numeric,1000::numeric,'fijo','',2),
  ('Sueldo de la cocinera','cocinera',null::numeric,null::numeric,'fijo','Por definir',3),
  ('Bebidas y bar','bebidas',null::numeric,null::numeric,'variable','Por definir',4)
) as v(nombre,categoria,minimo,maximo,tipo,nota,orden)
where not exists (select 1 from marea.presupuesto p where p.nombre = v.nombre);

-- noches y actividades del viaje a Same (llegan como propuestas: el admin las pasa al itinerario con su día)
insert into marea.eventos (titulo, tematica, descripcion, bloque, hora, lugar, dress_code, estilo, estado)
select v.titulo, v.tematica, v.descripcion, v.bloque, v.hora::time, v.lugar, v.dress_code, v.estilo::jsonb, 'propuesta'
from (values
 ('Taco & Sunset Grill Night','Bienvenida','Parrillada al atardecer con tacos de camarón y de carne y salsas variadas.','noche','19:00','terraza','Noche Tropical',
  '{"nombre":"Noche Tropical","descripcion":"Telas ligeras, hombros descubiertos, estampados de flores y colores de atardecer.","paleta":["#FF7A55","#F2C14E","#2BB3A3","#F7E8D0"],"ideas":["Vestidos de lino","Camisas de flores","Sandalias","Dorado mínimo"]}'),
 ('Karaoke con proyector','Karaoke','Proyector, dos micrófonos y una canción obligatoria por persona.','noche','21:30','sala','Brillos y neón',
  '{"nombre":"Brillos y neón","descripcion":"Lentejuelas, colores eléctricos y algo que brille con el proyector.","paleta":["#C13CFF","#FF3CAC","#2B5BFF","#141414"],"ideas":["Lentejuelas","Gafas de colores","Pulseras de neón"]}'),
 ('Pizza & Boardgames Night','Juegos de mesa','Pizzas caseras armadas al gusto y mesas de Risk y Monopoly.','noche','20:00','casa','Pijama elegante',
  '{"nombre":"Pijama elegante","descripcion":"Cómodo para cuatro horas de Risk, pero con estilo.","paleta":["#F4D6CC","#9AB0C9","#FFFFFF"],"ideas":["Pijama de satín","Pantuflas","Bata"]}'),
 ('Spanish Tapas & Wine Night','Tapas, vino e hipnosis','Tablas de tapas y quesos con maridaje guiado; cierra con la sesión de hipnosis.','noche','20:00','terraza','Santorini / Mediterranean Chic',
  '{"nombre":"Santorini / Mediterranean Chic","descripcion":"Blanco impecable para la producción de fotos: lino y algodón con toques azul Egeo y dorado.","paleta":["#FFFFFF","#F1ECE2","#1F5FAF","#C9A227"],"ideas":["Todo blanco","Lino","Sombrero de ala ancha","Sandalias de cuero"]}'),
 ('Talent Show','Talentos','Tres minutos por persona o grupo; cada quien anota su talento en su ficha.','noche','20:30','sala','De gala playera',
  '{"nombre":"De gala playera","descripcion":"Lo más elegante que quepa en la maleta; descalzos si se quiere.","paleta":["#0E2A33","#C9A227","#FFFFFF"],"ideas":["Algo que brille","Saco sin corbata","Vestido largo"]}'),
 ('Círculo de intenciones bajo las estrellas','Cierre del viaje','Fogata, mantas y una ronda de intenciones para cerrar el viaje.','noche','22:30','playa','Tierra y lino',
  '{"nombre":"Tierra y lino","descripcion":"Tonos arena y tierra, ropa cómoda para la fogata.","paleta":["#C2A07A","#8B6B4A","#EDE3D2"],"ideas":["Lino","Manta","Abrigo ligero"]}'),
 ('Yoga matutino','Bienestar','Sesión suave frente al mar antes del desayuno.','manana','07:00','playa','Ropa deportiva',null),
 ('Torneo de panzazos en la piscina','Piscina','Jurado de tres, notas del 1 al 10 por salpicadura y estilo.','tarde','15:30','piscina','Traje de baño',null),
 ('Spike ball y paletas de playa','Deporte','Parejas sorteadas y eliminación directa.','tarde','16:00','playa','Color del equipo',null),
 ('Sesión de fotos con gafas de sol','Fotos','Golden hour: fotos de grupo y de marca con gafas de sol.','tarde','17:30','playa','Gafas de sol y blanco',
  '{"nombre":"Gafas de sol y blanco","descripcion":"Base blanca o negra; las gafas de sol son las protagonistas.","paleta":["#FFFFFF","#141414","#F2C14E"],"ideas":["Gafas de sol","Camisa blanca","Sombrero"]}')
) as v(titulo,tematica,descripcion,bloque,hora,lugar,dress_code,estilo)
where not exists (select 1 from marea.eventos e where e.titulo = v.titulo);

update marea.config set valor = jsonb_set(valor, '{lugar}', '"Same, Esmeraldas"') where clave='viaje' and coalesce(valor->>'lugar','') = '';

-- propuestas de la primera versión que quedaron repetidas con las de Same (solo si nadie las votó ni las programó)
delete from marea.eventos e
where e.estado = 'propuesta'
  and e.titulo in ('Taquiza del mar','Karaoke · Grandes éxitos','Casino sin plata','Asado de los Villalba','Noche blanca',
                   'Playa''s Got Talent','Yoga al amanecer','Cada quien su cóctel','Mystery menu','Reto Chopped',
                   'Pancakes bar','Brunch de frutas y smoothies')
  and not exists (select 1 from marea.votos v where v.evento_id = e.id)
  and not exists (select 1 from marea.tareas t where t.evento_id = e.id)
  and not exists (select 1 from marea.gastos g where g.evento_id = e.id);
