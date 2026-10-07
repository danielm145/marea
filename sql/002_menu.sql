-- ============================================================================
-- MAREA ALTA · 002 · menú de cada plan (idempotente)
-- Correr DESPUÉS de 001_esquema.sql, en el SQL editor de fieldbuilt-lab.
-- ============================================================================
set search_path = marea, public;
alter table marea.eventos add column if not exists menu jsonb not null default '[]'::jsonb;

-- menús sugeridos para las propuestas sembradas (solo si siguen vacíos)
update marea.eventos e set menu = m.menu::jsonb
from (values
 ('Taquiza del mar','["Tacos de camarón","Tacos de pescado apanado","Pulpo a la plancha","Guacamole y pico de gallo","Micheladas y limonada"]'),
 ('Karaoke · Grandes éxitos','["Picada de quesos y embutidos","Canguil","Shots para los que desafinan"]'),
 ('Casino sin plata','["Pizzas caseras","Nachos con queso","Cerveza fría"]'),
 ('Asado de los Villalba','["Lomo y costillas","Choripanes","Maduros con queso","Ensalada de la casa","Chimichurri"]'),
 ('Noche blanca','["Ceviche de camarón","Patacones","El cóctel oficial del viaje"]'),
 ('Throwback 2000s','["Hot dogs","Papas fritas","Gaseosas de vidrio"]'),
 ('Cine bajo las estrellas','["Canguil","Chocolates","Chocolate caliente"]'),
 ('Pancakes bar','["Pancakes","Frutas picadas","Miel, Nutella y manjar","Café y jugo de naranja"]'),
 ('Brunch de frutas y smoothies','["Bowl de frutas","Smoothies de mango y frutilla","Tostadas con aguacate","Huevos revueltos"]'),
 ('Yoga al amanecer','["Agua de coco","Granola con yogur"]')
) as m(titulo, menu)
where e.titulo = m.titulo and e.menu = '[]'::jsonb
  and m.menu::jsonb is not null;
