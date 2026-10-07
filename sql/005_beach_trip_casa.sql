-- Beach Trip v7 · nombre nuevo y la casa del Airbnb (Casablanca, Same).
-- Idempotente: mezcla en config.viaje sin borrar lo que el admin ya llenó (WiFi, contactos, fotos...).
-- Solo toca el esquema marea.
set search_path = marea, public;

update config
   set valor = jsonb_set(
         valor || jsonb_build_object('nombre', 'Beach Trip'),
         '{info}',
         coalesce(valor->'info', '{}'::jsonb) || jsonb_build_object(
           'casa_titulo', 'Precioso departamento en Casablanca (frente a la playa)',
           'airbnb_url',  'https://www.airbnb.cl/rooms/49074368',
           'direccion',   coalesce(nullif(valor->'info'->>'direccion',''), 'Condominio Alcazaba del Río, Casablanca · Same, Esmeraldas'),
           'casa_desc',   E'Planta baja del Condominio Alcazaba del Río, en Casablanca (Same). A pocos metros de la piscina y el jacuzzi y a 10 gradas de la playa.\n\nSala, cocina, lavandería, 3 habitaciones y 2 baños completos. Terraza amplia y jardín con vista al mar: ideal para desayunar afuera y para las noches temáticas.\n\n¿Dónde dormimos?\n· Habitación 1: cama principal\n· Habitación 2: 2 camas individuales (literas)\n· Habitación 3: 4 camas individuales (literas)\n\nEl Airbnb dice 8 huéspedes · 7 camas · 2 baños · 4,83 ★ (35 reseñas).\nOjo: la casa no tiene detector de humo ni de monóxido.',
           'amenidades',  jsonb_build_array('Acceso a la playa (10 gradas)','Vista a la bahía','Piscina al aire libre (con horario)','Jacuzzi compartido','Terraza y jardín','Wifi','TV','Cocina','Lavandería','Parqueadero gratis','Toallas de baño y de playa','Sábanas','Carpa y sillas de playa','Fácil acceso')
         ))
 where clave = 'viaje'
   and coalesce(valor->>'nombre','Marea Alta') in ('Marea Alta','Beach Trip');

select valor->>'nombre' as nombre, valor->'info'->>'casa_titulo' as casa from config where clave = 'viaje';
