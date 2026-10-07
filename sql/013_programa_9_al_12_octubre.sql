-- v29 · el programa en los 4 días reales (Daniel, 7-oct-2026). Idempotente. Solo esquema marea.
--   Vie 9  · Día 1 · Llegada : Llegada y check-in · Círculo de intenciones (Welcome White Night)
--   Sáb 10 · Día 2           : Yoga · Panzazos · BBQ & Cocktail Night · Karaoke y Talent Show (Golden Hour)
--   Dom 11 · Día 3           : Spike ball y paletas · Sesión de fotos Freaky Monkey · Tapas & Wine Night (Tiki Boho)
--   Lun 12 · Día 4 · Salida  : Check-out y regreso
-- Pizza & Game Night y Restaurant Night quedan como propuestas (sin día) para que el grupo vote.
-- Solo programa planes que todavía no tienen día (no pisa lo que el admin ya movió).
with p(titulo, dia, hora, bloque) as (values
  ('Llegada y check-in',                       date '2026-10-09', time '15:00', 'tarde'),
  ('Círculo de intenciones bajo las estrellas', date '2026-10-09', time '21:30', 'noche'),
  ('Yoga matutino',                            date '2026-10-10', time '07:00', 'manana'),
  ('Torneo de panzazos en la piscina',         date '2026-10-10', time '15:00', 'tarde'),
  ('BBQ & Cocktail Night',                     date '2026-10-10', time '18:00', 'atardecer'),
  ('Karaoke y Talent Show',                    date '2026-10-10', time '21:30', 'noche'),
  ('Spike ball, red y paletas de playa',       date '2026-10-11', time '10:30', 'manana'),
  ('Sesión de fotos Freaky Monkey',            date '2026-10-11', time '17:00', 'atardecer'),
  ('Tapas & Wine Night',                       date '2026-10-11', time '20:00', 'noche'),
  ('Check-out y regreso',                      date '2026-10-12', time '11:00', 'manana'))
update marea.eventos e set dia = p.dia, hora = p.hora, bloque = p.bloque,
       estado = case when e.estado = 'propuesta' then 'oficial' else e.estado end
  from p where e.titulo = p.titulo and e.dia is null;

insert into marea.eventos (titulo, tematica, descripcion, bloque, hora, lugar, dress_code, dia, estado, lista)
select 'Check-out y regreso', 'Despedida',
       'Último desayuno, foto de grupo en la playa, recoger todo y entregar la casa antes del mediodía. Repartimos lo que sobró de la despensa y salimos con calma.',
       'manana', time '11:00', 'casa', '', date '2026-10-12', 'oficial',
       '[{"txt":"Revisar cuartos y baños","ok":false},{"txt":"Sacar la basura","ok":false},{"txt":"Vaciar la nevera","ok":false},{"txt":"Llaves de la casa","ok":false},{"txt":"Cuentas al día en la app","ok":false}]'::jsonb
where not exists (select 1 from marea.eventos where titulo = 'Check-out y regreso');
