-- Casablanca v58 · el carro es una Lexus GX 460 (Daniel, 9-oct-2026). Idempotente. Solo esquema marea.
set search_path = marea, public;
update marea.vehiculos set nombre = 'Lexus GX 460' where nombre in ('Lexus', 'Lexus de Kevin');
update marea.eventos set descripcion = replace(descripcion, 'el Lexus (', 'la Lexus GX 460 (')
 where titulo = 'Salida desde la casa de la Ale' and descripcion like '%el Lexus (%';
