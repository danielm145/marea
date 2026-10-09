-- Casablanca · día de salida (Daniel, 9-oct-2026, 2 a.m.):
--   1. el mapa exacto de la casa de la Ale (punto de salida, 8:00 a.m.)
--   2. votación: ¿dónde almorzamos hoy en el camino? (propuestas con tematica «Almuerzo de camino»)
--   3. mensaje de bienvenida en el chat de parte de Daniel
-- Idempotente. Solo esquema marea.
set search_path = marea, public;

-- 1 · punto de salida con su mapa
update marea.config
   set valor = jsonb_set(valor, '{info}', coalesce(valor->'info', '{}'::jsonb) || jsonb_build_object(
         'salida_mapa', 'https://maps.app.goo.gl/Pop3Z1AsiefPjZfPA',
         'salida_lugar', coalesce(nullif(valor->'info'->>'salida_lugar', ''), 'Cumbayá · casa de la Ale'),
         'salida_hora', coalesce(nullif(valor->'info'->>'salida_hora', ''), '08:00')), true)
 where clave = 'viaje';

-- 2 · opciones para votar el almuerzo (no se duplican si se corre otra vez)
do $$
declare admin uuid; dia date;
begin
  select id into admin from marea.personas where rol = 'admin' and activo order by created_at limit 1;
  select coalesce((valor->>'desde')::date, date '2026-10-09') into dia from marea.config where clave = 'viaje';
  insert into marea.eventos (titulo, tematica, descripcion, dia, bloque, hora, lugar, estado, creado_por)
  select v.titulo, 'Almuerzo de camino', v.descripcion, dia, 'tarde', v.hora::time, v.lugar, 'propuesta', admin
  from (values
    ('Directo al ceviche de la casa', 'Llegamos sin parar (picamos algo en el carro) y almorzamos el ceviche que nos espera en la casa. Más tiempo de playa.', '14:00', 'casa'),
    ('Encocado en Esmeraldas', 'Parada en Esmeraldas o Tonsupa: encocado de pescado o camarón con patacones, antes de la última hora de viaje.', '13:30', 'restaurante'),
    ('Mariscos frente al mar en Atacames', 'A media hora de Same: arroz marinero, encebollado o pescado frito con vista al mar, y llegamos con la barriga llena.', '14:00', 'restaurante'),
    ('Almuerzo típico en la vía (La Concordia)', 'Más temprano, a mitad de camino: seco de pollo, menestra y jugos naturales en un paradero, y seguimos derecho.', '12:00', 'restaurante')
  ) as v(titulo, descripcion, hora, lugar)
  where not exists (select 1 from marea.eventos e where e.titulo = v.titulo and e.tematica = 'Almuerzo de camino');
end $$;

-- 3 · la bienvenida en el chat (una sola vez)
insert into marea.mensajes (persona_id, texto)
select p.id, '¡Bienvenidos al viaje a la playa! 🏖️ Salimos HOY a las 8:00 a.m. desde la casa de la Ale (el mapa está en la app, en «Todo del viaje»). En la casa nos espera ceviche 🦐. Voten en la app dónde almorzamos en el camino 🗳️ y recuerden: TODO gasto va a la app, foto a la factura y listo 💸'
from marea.personas p
where p.rol = 'admin' and p.activo
  and not exists (select 1 from marea.mensajes m where m.texto like '¡Bienvenidos al viaje a la playa!%')
order by p.created_at limit 1;
