-- Beach Trip v8 · el menú de Kevin (4 noches) y los looks del grupo (Welcome White Night, Golden Hour, Tiki Boho Funny).
-- Idempotente. Solo esquema marea. Renombra las noches viejas (conserva votos, tareas y fotos ligadas) y crea las que faltan.
set search_path = marea, public;

-- renombrar sin duplicar: solo si la nueva todavía no existe
update eventos set titulo='Pizza & Game Night' where titulo='Pizza & Boardgames Night' and not exists (select 1 from eventos where titulo='Pizza & Game Night');
update eventos set titulo='BBQ & Cocktail Night' where titulo='Taco & Sunset Grill Night' and not exists (select 1 from eventos where titulo='BBQ & Cocktail Night');
update eventos set titulo='Tapas & Wine Night' where titulo='Spanish Tapas & Wine Night' and not exists (select 1 from eventos where titulo='Tapas & Wine Night');
update eventos set titulo='Sesión de fotos Freaky Monkey' where titulo='Sesión de fotos con gafas de sol' and not exists (select 1 from eventos where titulo='Sesión de fotos Freaky Monkey');

insert into eventos (titulo, tematica, descripcion, bloque, hora, lugar, dress_code, estado)
select 'Restaurant Night','Cena de despedida','Última noche fuera de casa: cena tranquila para cerrar el viaje. Sin cocinar ni limpiar.','noche','20:00','restaurante','De gala playera','propuesta'
where not exists (select 1 from eventos where titulo='Restaurant Night');

-- contenido de cada noche (lo que dice el menú de Kevin) y su look
update eventos set tematica='Pizza y juegos', bloque='noche', hora='20:00', dress_code='Pijama elegante',
  descripcion='Pizzas caseras armadas entre todos (margarita, pepperoni, prosciutto con rúcula, cuatro quesos y libre). Juegos: UNO, Jenga, Pictionary, charadas y Heads Up! Competencia a la mejor y a la peor pizza. Monopoly y Risk quedan en la mesa para los valientes.',
  menu='["Pizzas caseras armadas entre todos","Cerveza fría y gaseosas","Cerveza cero"]'::jsonb
  where titulo='Pizza & Game Night';
update eventos set tematica='Parrillada y cócteles', bloque='atardecer', hora='18:00', dress_code='Golden Hour',
  descripcion='Parrillada al atardecer: picaña o entraña, pollo, chorizos, mazorcas, maduros y papas, con chimichurri. Barra de cócteles (mojitos, margaritas, cuba libre) y opciones sin alcohol.',
  menu='["Parrillada","Chimichurri y acompañamientos","Barra de cócteles","Cócteles sin alcohol"]'::jsonb,
  estilo='{"nombre":"Golden Hour · Día 2","descripcion":"Dorado, beige y chocolate para la parrillada al atardecer: brillos, satén y lino en los colores del sol cuando baja.","paleta":["#C9A227","#E6D3A3","#8B5E3C","#F5EBDD"],"ideas":["Vestido con brillo dorado o satinado","Lino beige o arena","Camisa café o camel abierta","Joyas doradas","Falda larga chocolate","Sandalias doradas"]}'::jsonb
  where titulo='BBQ & Cocktail Night';
update eventos set hora='21:30', dress_code='Golden Hour',
  estilo=(select estilo from eventos where titulo='BBQ & Cocktail Night' limit 1)
  where titulo='Karaoke y Talent Show';
update eventos set tematica='Tapas, vino e hipnosis', dress_code='Tiki Boho Funny',
  descripcion='Gambas al ajillo, patatas bravas, tortilla española, pan con tomate y jamón, croquetas; quesos, embutidos y aceitunas. Vino blanco y tinto Tempranillo o Rioja, con una clase corta de enología. Cierra con la sesión de hipnosis.',
  menu='["Tapas españolas","Quesos, embutidos y aceitunas","Vino blanco y Tempranillo o Rioja","Sangría sin alcohol"]'::jsonb,
  estilo='{"nombre":"Tiki Boho Funny · Día 3","descripcion":"Camisas hawaianas, flores, boho y un toque de humor: entre más tropical y divertido, mejor. Combina con las gafas de Freaky Monkey.","paleta":["#F28C28","#E8457C","#2BB3A3","#F6D55C","#6B3E26"],"ideas":["Camisa hawaiana","Collar de flores","Sombrero de paja o bucket","Falda boho larga","Flor en el pelo","Accesorios con conchas","Gafas Freaky Monkey"]}'::jsonb
  where titulo='Tapas & Wine Night';
update eventos set tematica='Fotos con gafas', bloque='atardecer', hora='17:00', dress_code='Tiki Boho Funny',
  descripcion='Al atardecer con las gafas de Freaky Monkey: fotos de grupo, por parejas y de cerca a las gafas, con el look Tiki Boho del día 3.',
  estilo=(select estilo from eventos where titulo='Tapas & Wine Night' limit 1)
  where titulo='Sesión de fotos Freaky Monkey';
update eventos set dress_code='Welcome White Night',
  descripcion='Welcome White Night: después de la cena ligera costeña, fogata, mantas y una ronda de intenciones para abrir el viaje.',
  estilo='{"nombre":"Welcome White Night","descripcion":"La noche de llegada, todos de blanco: lino, crochet y algodón en tonos crudo y arena. Fresco, limpio y para la primera foto del grupo.","paleta":["#FFFFFF","#F3EDE2","#E4D8C4","#B89B72"],"ideas":["Lino blanco","Crochet o tejido","Camisa blanca abierta","Bikini o enterizo blanco debajo","Sandalias de cuero","Sombrero de paja"]}'::jsonb
  where titulo='Círculo de intenciones bajo las estrellas';

-- equipo de los juegos y las gafas
insert into equipo (nombre, categoria, cantidad)
select v.nombre, v.categoria, v.cantidad from (values ('Jenga','juegos',1),('Pictionary y Heads Up!','juegos',1),('Gafas Freaky Monkey para la sesión','fotos',12)) as v(nombre,categoria,cantidad)
where not exists (select 1 from equipo e where e.nombre = v.nombre);

select titulo, bloque, hora, dress_code from eventos where titulo in ('Pizza & Game Night','BBQ & Cocktail Night','Tapas & Wine Night','Restaurant Night','Sesión de fotos Freaky Monkey') order by titulo;
