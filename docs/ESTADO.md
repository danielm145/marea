# Estado · Casablanca (antes Beach Trip y Marea Alta)

> Lo primero que lee quien retome. Última actualización: **7-oct-2026 · v30**.

## v30 (7-oct) · un comando para publicar con Vertex y usuarios de verdad
- **`scripts/conectar.sh`** (lee `.env`): aplica `sql/001…013` con la Management API de Supabase, expone el esquema
  `marea`, crea/repara al admin con celular + cumpleaños (`scripts/conectar.mjs`), despliega `marea-admin-personas`,
  pone `SB_URL`/`SB_ANON` como secretos del Worker, conecta Vertex (`ia.sh`) y publica (`deploy.sh`). Repetible.
  Probado contra Postgres real (API simulada): 13 SQL, esquema expuesto, admin creado; segunda vez sin duplicar.
- **Ninguna llave en el código**: la app pide `/api/config.js` al Worker (`window.MAREA_SB`). Sin esas variables
  corre en demo (vista previa, archivo local).
- **Con Supabase conectado, la IA solo atiende a quien tiene sesión** (el Worker valida el JWT con Supabase y lo
  recuerda 5 min). 19 pruebas del Worker.
- `.env.example` reescrito (celular y cumpleaños del admin; de dónde sale cada llave). Guía: **`docs/PUBLICAR.md`**.
  Prompt para Claude Code local: `docs/PROMPT-CLAUDE-LOCAL.md`.

## v29 (7-oct) · las fechas de verdad: viernes 9 al lunes 12 de octubre
- `VIAJE_DESDE/HASTA` = **2026-10-09 → 2026-10-12** (4 días, 3 noches). La demo se calcula desde esas fechas (v16).
- **Los días se llaman como los collages**: Día 1 · Llegada (vie) · Día 2 (sáb, Golden Hour) · Día 3 (dom, Tiki Boho)
  · Día 4 · Salida (lun).
- **Programa acomodado** (cambiable con «Cambiar con IA»):
  Vie: Llegada 15:00, Círculo de intenciones 21:30 (Welcome White Night) ·
  Sáb: Yoga 07:00, Panzazos 15:00, BBQ & Cocktail 18:00, Karaoke y Talent 21:30 (Golden Hour) ·
  Dom: Spike ball 10:30, Fotos Freaky Monkey 17:00, Tapas & Wine 20:00 (Tiki Boho) ·
  Lun: **Check-out y regreso** 11:00 (nuevo, con su lista).
  **Pizza & Game Night y Restaurant Night quedan como propuestas** (no caben en 3 noches): que voten.
- Menú: el día de salida solo desayuno y almuerzo (sin cena en la casa).
- `sql/012` pone 9–12 oct en Supabase y `sql/013_programa_9_al_12_octubre.sql` programa los planes y crea el
  check-out (idempotentes; solo planes sin día).

## v28 (7-oct) · un solo botón para registrar y las fechas reales del viaje
- **Home: un solo botón «Registrar con IA»** (antes Foto + Escribir).
- **La pantalla de registrar es una sola caja**: texto (se puede dictar), «Agregar foto» opcional, 4 chips y un botón
  grande «Registrar». Sin pestañas: la IA decide si es gasto, pendiente, plan, foto del álbum, portada o fechas.
  Fuera «Varias fotos al álbum» (sigue en la pestaña Álbum). Desde un plan se abre como «Gasto de «…»» o «Propón un plan».
- Fechas fijas (luego corregidas en v29) (`VIAJE_DESDE/HASTA`; antes la demo usaba «hoy + 21»).
  La demo se re-siembra (v15) para que los teléfonos con fechas raras (2 oct – 9 nov) queden bien.
  `sql/012_fechas_del_viaje.sql` las pone en Supabase si están vacías.
- **Las fechas también se cambian con IA**: «el viaje es del 28 de octubre al 1 de noviembre» → hoja «Datos del viaje»
  con antes → después y Guardar (solo admin). El formulario de Admin pregunta si el viaje pasa de 30 días.
- Arriba en Hoy dice «4 noches» (antes «4 días», que chocaba con los 5 días del itinerario).

## v27 (7-oct) · cambiar la foto de cualquier plan (con un toque o diciéndoselo a la IA)
- Cada plan puede tener **su propia foto** (`eventos.foto`, `sql/011_foto_de_eventos.sql`): manda sobre la generada.
  En el detalle del plan, botón **«Cambiar foto»** arriba a la izquierda (admin, quien lo creó o lo organiza);
  en la ficha del plan con IA, tocar la foto la cambia.
- **«Cuéntale a la IA» entiende la portada**: foto + «ponla de portada del círculo de intenciones» → se abre
  «Foto de portada» con el plan ya escogido y el botón «Poner de portada de «…»». Funciona también sin IA
  (lectura rápida) y desde el botón «Gasto» de un evento (antes eso armaba un gasto raro: lo que le pasó a Daniel).
  Sin foto, la hoja la pide. Worker: campo `portada` en la propuesta (16 pruebas).
- La foto del **panzazo** que mandó Daniel es la de «Torneo de panzazos en la piscina»
  (`public/img/eventos/torneo-de-panzazos-en-la-piscina.jpg`; el generador no la pisa porque ya existe).

## v26 (7-oct) · los planes también con IA, nada a mano
- «Cuéntale a la IA» ahora tiene 4 modos: **Lo que sea · Un gasto · Pendientes · Un plan**. La foto va abajo,
  después del texto y los chips. Fuera «Una tarea a mano» y «XML de la factura» (queda «Varias fotos al álbum»).
- **Proponer un plan = contárselo a la IA**: ella llena la ficha completa (nombre, de qué se trata, cuándo, dónde,
  look, qué llevar y menú) y se cambia TOCANDO (momento, lugar, look; día y hora solo el admin; tocar un ítem de la
  lista lo quita). Se acabó el formulario `abrirFormEvento` (borrado).
- **Modificar un plan = «Cambiar con IA»** en el detalle del evento: se le dice qué cambiar («a las 8 y media, con
  micheladas») y devuelve el mismo plan con solo eso cambiado; lo ya marcado en la lista se conserva.
- Worker: los planes traen hora, lista y menú; `plan_actual` en el contexto para cambiar uno; looks del viaje
  para que escoja el dress code. Pruebas: `tests/worker-ia.test.mjs` (15), `tests/e2e-planes-ia.mjs`.
- Pendiente si Daniel lo pide: lo mismo para editar tareas (hoy se crean con IA, pero se editan con formulario).

## v25 (7-oct) · caras del grupo y foto en grande
- **5 caras puestas** desde la captura de Instagram que mandó Daniel (`public/img/gente/`): Daniel, Ana Paula,
  Alegría, Domenika y Naty (recortes de la foto de perfil, 400 px). **Faltan Kevin, Ana Cris y Amelia**: en la
  captura salían tapadas («+2») o cortadas — pedir sus capturas o que suban su foto desde «Mi ficha».
  Ojo: las fotos de perfil venían chicas en la captura (~80 px), por eso en grande se ven suaves.
- **Tocar la foto la agranda**: en la ficha de cada persona la foto abre un visor a pantalla completa con su
  nombre e Instagram (se cierra tocando o con Escape). Las caras del encabezado de Hoy llevan a Viajeros.
- La vista previa (artefacto) también muestra las caras: van como mapa ruta → data URI (`window.FOTOS_DATA`).

## v24 (7-oct) · Vertex de la empresa, una imagen por evento, caras y eventos completos
- **IA con Vertex como en AERO EC**: el Worker usa la cuenta de servicio (secreto `GOOGLE_SA_B64`, JWT RS256
  con crypto.subtle, token cacheado 50 min, `gemini-2.5-flash` en us-central1). Quedan de respaldo
  `VERTEX_API_KEY` y `GEMINI_API_KEY`. `scripts/ia.sh` encuentra la cuenta de servicio en el Mac y la sube.
- **Imágenes con Vertex**: `scripts/generar-imagenes.mjs` usa la misma cuenta de servicio (Imagen 4; si no está
  habilitado, `gemini-2.5-flash-image` en Vertex). Una imagen por evento en `public/img/eventos/<slug>.jpg`
  (prompt según su tema, look y lugar) + comida + portada-hero.
- **La app ya no pide fotos que no existen**: `public/img/generadas.js` (lo escribe `scripts/listar-fotos.mjs`)
  dice qué fotos opcionales hay. Antes cada foto faltante de `img/playa` hacía que Cloudflare devolviera la app
  entera (~440 KB) por cada una, varias veces por pantalla.
- **Caras**: si alguien no ha subido foto, se usa `img/gente/<nombre>.jpg` (sacada de su Instagram).
- **Eventos con toda la info**: los 15 traen descripción completa (qué es, cómo va, horario) y su lista de qué
  llevar o comprar (se puede convertir en tareas). `sql/010_eventos_completos.sql` hace lo mismo en Supabase
  (idempotente, no pisa lo que alguien llenó). Demo resembrada (v14).
- Lo que necesita el Mac (cuenta de servicio, generar imágenes, recortar caras, publicar en casablanca):
  **`docs/PROMPT-CLAUDE-LOCAL.md`** — prompt listo para Claude Code local.

## v23 (7-oct) · la IA en la URL + casablanca.fieldbuil.ai + home limpio
- **Dominio oficial: https://casablanca.fieldbuil.ai** (`wrangler.dominio.toml` amarra casablanca y deja vivo marea).
  `deploy.sh` revisa los tres y dice si la IA está conectada.
- **La IA vive en el mismo Worker** (`worker/index.js`): `POST /api/ia` (texto y/o foto → propuesta de gastos,
  tareas, planes o foto para el álbum) y `GET /api/ia/salud`. Motor: **Vertex AI** (modo express, secreto
  `VERTEX_API_KEY`) o **Gemini API** (secreto `GEMINI_API_KEY`), modelo `gemini-2.5-flash` con esquema JSON.
  La llave es un SECRETO de Cloudflare: `scripts/ia.sh` la busca en el Mac (CREDENCIALES) y la sube sin mostrarla.
  Funciona en modo demo y con Supabase; si la IA no está o falla, la app usa la lectura rápida y lo dice.
  Defensas: solo acepta llamadas desde su propio dominio, freno de 40 lecturas/10 min por IP, foto ≤ 6 MB,
  y `limpiar()` revisa todo lo que devuelve la IA (solo ids de personas y planes reales, montos con 2 decimales,
  RUC de 13 dígitos). Pruebas: `node tests/worker-ia.test.mjs` (13 casos, Gemini simulado).
- **«Cuéntale a la IA»**: el único lugar para registrar (tarjeta en el home con Foto / Escribir y el botón +).
  Foto (factura, ticket, transferencia o foto del viaje) + texto; chips para escoger en vez de escribir
  («Pagué yo», «Para todos menos…»); mientras piensa se ve el avance. El gasto que vuelve **se va llenando
  a la vista** y todo se cambia TOCANDO: caras para quién pagó y entre quiénes (con lo que le toca a cada uno),
  chips de categoría y de plan. Si la foto es del viaje, propone guardarla en el álbum con un pie escrito por la IA.
- **Home: menos es más** — fuera la frase «Desconecta · Comparte · Vive el momento», los accesos rápidos
  (repetían la barra de abajo) y la fila de stickers; queda el sticker Our Beach Era al final.
- Prueba de punta a punta: `tests/e2e-ia-registro.mjs` (IA simulada, servido por http).

### Para que la IA funcione en la URL (Daniel, en el Mac, una sola vez)
```
cd ~/marea && git pull && scripts/deploy.sh wrangler.dominio.toml   # publica y amarra casablanca.fieldbuil.ai
# al conectar Supabase: correr también sql/010_eventos_completos.sql y sql/011_foto_de_eventos.sql y sql/012_fechas_del_viaje.sql y sql/013_programa_9_al_12_octubre.sql
scripts/ia.sh            # Gemini (llave AIza… que ya está en CREDENCIALES)  ·  o:  scripts/ia.sh vertex
```
`deploy.sh` debe terminar diciendo `IA: gemini` (o `vertex`) en las tres URLs.
Ojo: hasta conectar Supabase, cada teléfono guarda sus propios datos (modo demo). La IA ya sirve igual.

## v22 (7-oct) · portada de Hoy más linda
- Portada de Hoy: **atardecer rosado de la piscina** (cuadro del video del condominio, sin marca de agua,
  retocado cálido) en vez de la foto gris de la playa — `img/casa/atardecer.jpg`. Capa oscura más suave.
- Lista la **ilustración «beach era»** (estilo de los stickers vintage: playa de Same, palmeras, sol coral, cerro con
  edificios blancos), vertical 3:4. Daniel la genera en su Mac y la app la toma sola como portada:
  `node scripts/generar-imagenes.mjs portada-hero` → `public/img/playa/portada-hero.jpg` (sube BUILD_TAG y despliega).
  `generar-imagenes.mjs` ahora acepta prompt y proporción propios por imagen.

## v21 (7-oct) · chao Beach Trip
- La tarjeta para instalar la app decía «Ten Beach Trip como app»: ahora «Ten Same como app» (pedido de Daniel).
  Comentarios y encabezados de scripts sin el nombre viejo. Los SQL ya aplicados conservan su historia.
- Si el ícono instalado en un teléfono todavía dice «Beach Trip», es la instalación vieja: borrarlo y volver a
  instalar desde marea.fieldbuil.ai.

## v20 (7-oct) · de vuelta a Casablanca
- Daniel decidió que el viaje vuelve a ser **Casablanca** (logo y nombre). Our Beach Era queda solo como sticker
  (al pie de Hoy, ahora recortado limpio). La v19 nunca se desplegó.
- Logo Casablanca rehecho desde la versión nítida que mandó Daniel (1566 px, fondo blanco quitado):
  `img/logo-casablanca.webp` y `stickers/casablanca.webp`. Íconos de la app regenerados.
- Se borró `sql/010`; `sql/009` ahora también cambia «Our Beach Era» a «Casablanca». Demo resembrada (v13).

## v19 (7-oct) · el viaje se llama Our Beach Era
- Logo del viaje: **Our Beach Era** (`public/img/logo-beach-era.webp`, recortado limpio de la hoja de stickers con
  fondo transparente; también reemplaza `stickers/beach-era.webp`). Login, portada de Hoy, encabezado, íconos de la
  app y manifest («Our Beach Era · Same», corto «Beach Era»).
- **Casablanca queda como el nombre de la casa**: su sticker sale en Info y al pie de Hoy.
- `sql/010_nombre_our_beach_era.sql` cambia el nombre en la base (solo si tenía un nombre por defecto).
  La demo se vuelve a sembrar (v12) para tomar el nombre nuevo.
- La v18 ya quedó publicada por Daniel en workers.dev y en **marea.fieldbuil.ai** (dominio funcionando).

## v18 (7-oct) · lo que faltaba de los mockups
- **Detalle de evento con pestañas** Info · Menú · Participantes (`evTab`, `EVTAB`). «Me apunto» queda arriba
  de las pestañas. Menú trae la frase «Buena comida, mejores conversaciones y un viaje inolvidable.»; Participantes
  muestra quién lo organiza y la cuadrícula de quién va. Arreglado de paso: un rótulo mostraba código en pantalla.
- **Cena de llegada con fotos** de los platos (`img/menu/llegada-*.jpg`, recortadas de los mockups: eran las
  únicas lo bastante grandes; las demás fotos de los mockups miden 80–270 px).
- **Hoy**: frase «Desconecta · Comparte · Vive el momento» y píldora «Faltan N días».
- **Info**: fila de amenidades con íconos (Wi-Fi, habitaciones, piscina, cocina, parking, jacuzzi) y botón
  «Ver en mapa» sobre la foto.
- **Álbum → Momentos**: cada plan con su foto y cuántas fotos tiene.
- **Lista de compras**: filtros por categoría, barra «x de N comprados» y casillas que se recuerdan en el
  teléfono (`localStorage marea_compras`, por persona).
- Prueba: `tests/e2e-pestanas-compras.mjs`.

## v17 (7-oct) · el viaje se llama Casablanca
- Logo oficial del viaje: **Casablanca** (`public/img/logo-casablanca.webp`, fondo transparente) en login, portada de Hoy,
  encabezado e íconos de la app (`icon-192/512.png`). Nombre por defecto «Casablanca»; `sql/009_nombre_casablanca.sql`
  lo cambia en la base. (En v18 se borró el SVG viejo de Beach Trip y la búsqueda de `img/logo.png`.)

## v16 (7-oct) · lo de los mockups nuevos + stickers
- **Stickers** (hoja «Our Beach Era» de Daniel) recortados con fondo transparente en `public/img/stickers/*.webp`
  y el logo **Casablanca**. Salen en login, Hoy, Más, Info, Mapa, Álbum, Gastos, Equipo, Checklist y Looks.
- **Chat del grupo** (Más → Chat): texto y fotos, se refresca solo cada 12 s. `sql/008_chat.sql` (tabla `mensajes`,
  cada quien escribe como sí mismo, borra lo suyo; el admin todo).
- **Mi checklist** (Más): la maleta de cada quien (lo esencial + «qué llevar» + lo que agregue), guardado en su ficha.
- **Equipo**: Tareas → Equipo muestra a los 8 con su rol (superpoder de la ficha, o el grupo de tareas que más tiene,
  o la noche que organiza). Lo que antes se llamaba Equipo ahora es «Cosas».
- **Mapa** (Itinerario → Mapa): mapa de Same (OpenStreetMap) y lugares que abren Google Maps por nombre + «Cómo llegar».
- **Propuestas** con filtros Mar · Relax · Aventura · Noche y botón «Proponer actividad». **Info** con portada y Fechas.
- **Para publicar el dominio** `marea.fieldbuil.ai` (una vez): `scripts/deploy.sh wrangler.dominio.toml`.

## v15 (7-oct) · rediseño copiando el mockup de Daniel
- Barra de abajo: **Hoy · Itinerario · Menú · Gastos · Más** (Tareas, Álbum, Viajeros, Looks, Info y Equipo viven en Más).
- **Hoy**: portada a pantalla completa con foto, logo, fechas y frase en letra script; 4 cifras (días, viajeros,
  actividades, pendientes); «Lo próximo» con foto y botón «Ver itinerario completo»; accesos rápidos.
- Páginas internas con encabezado centrado (atrás · Beach Trip · ⋯ con Mi ficha / Administrar / Salir).
- **Itinerario**: chips de día + línea de tiempo con hora a la izquierda y tarjetas con foto. Pestañas Itinerario ·
  Propuestas (cuadrícula con corazón para votar) · Looks · Info (lo esencial como lista).
- **Menú**: Carta del día (desayuno con lo incluido y Healthy/Normal para elegir; almuerzo y cena con Voy/No voy y
  los platos en tarjetas grandes) · Los 4 días («Nuestro menú», una fila por día) · Lista de compras.
- **Gastos**: «En total te deben» grande + quién te debe + Últimos movimientos. **Álbum** con portada y «Subir fotos».
- Fuente script: Dancing Script. Azul marino `--navy:#14335C` para lo seleccionado.

## v13 (7-oct) · fotos de ambiente
- `node scripts/fotos-stock.mjs` (en la Mac): baja fotos reales con licencia libre desde **Openverse** (sin llave) para
  cada plan y comida — gente en la playa, atardeceres, piscina, BBQ, tapas — a `public/img/playa/<nombre>.jpg`, y anota
  autor y licencia en `creditos.json` (la app los muestra en «Créditos de las fotos», abajo de todo).
  `--siguiente yoga` cambia una que no guste. Este entorno de la nube no puede bajarlas: su red bloquea esos dominios.
- Portada de cada plan: primero la foto de gente; si no está, la comida de esa noche o el collage del look.
- `imgTag` acepta varias fuentes y prueba la siguiente si una no existe.

## v8 (7-oct) · el menú de Kevin, los looks y los 8 invitados
- **Invitados: solo 8** (Daniel lo confirmó con sus Instagram): Daniel Martínez (admin), Ana Paula, Alegría, Kevin López,
  Ana Cristina **Grijalva**, **Domenika** Pérez, Natalia **Vásquez**, Amelia Camacho. Justo la capacidad del Airbnb.
  Cada ficha del demo trae su Instagram (con enlace).
- **Menú de Kevin** día por día: Llegada (cena ligera + Welcome White Night) y Días 1–4 con desayuno Healthy / Normal,
  almuerzo costeño y cena: **Pizza & Game Night · BBQ & Cocktail Night · Tapas & Wine Night · Restaurant Night** (fuera de casa).
  Menú → **«Los 4 días»**: la cuadrícula con foto de cada plato (recortadas del menú que mandó Kevin, `public/img/menu/`)
  y el póster original al tocar «Menú Same».
- **Looks** de los collages: Welcome White Night (llegada), Golden Hour (día 2), Tiki Boho Funny (día 3). Una tarjeta por día en Dress code.
- **Sesión de fotos Freaky Monkey** (día 3, atardecer) y 12 gafas en el equipo.
- Los días se llaman **Llegada, Día 1…4** en toda la app, igual que el menú de Kevin.
- `sql/006_menu_kevin_y_looks.sql`: renombra las noches en la base (conserva votos y tareas), crea Restaurant Night y pone los looks.
- Imágenes con IA: `scripts/generar-imagenes.mjs` ya trae las noches nuevas y los 3 looks; `GEMINI_MODELO=gemini-3-pro-image-preview` usa Nano Banana Pro.
- **Se entra con el CELULAR + clave = día y mes del cumpleaños (DDMM)** (Daniel, 7-oct). Ya no hay cédula ni PIN al azar.
  Auth: email `<celular>@marea.local`, contraseña `<celular>#<DDMM>`; el celular se guarda internacional sin '+' (593985576470).
  El mensaje de WhatsApp explica la regla y no lleva la clave. Admin crea con celular + cumpleaños; cambiar cualquiera
  de los dos actualiza Auth. `sql/007_login_celular_cumple.sql` (cédula opcional, `personas.cumple`, celular único,
  solo el admin cambia celular y cumpleaños). Demo: Daniel = 099 000 0001, clave 1001.
  ⚠️ La clave se adivina si alguien sabe tu celular y tu cumpleaños: aceptable para 8 amigos, no para algo más grande.
- **Gastos solo con IA**: un único «Nuevo gasto» (foto opcional + texto: quién pagó, quién sí, quién no, de qué es).
  La IA arma el gasto, lo reparte, lo liga a la noche y le pone etiquetas; se ve en una tarjeta limpia y se **corrige
  con texto** («Naty sí entra», «pagó Kevin», «fueron 52»). Editar un gasto guardado también es con IA. Sin formulario.
  Siguen los controles de causación (duplicado, presupuesto con porqué, memoria por comercio).
- **Dress code** rediseñado: una tarjeta grande por noche con la paleta de fondo y el collage de inspiración
  (`public/img/looks/{welcome-white,golden-hour,tiki-boho}.jpg` — **faltan las imágenes de Daniel**; si no están, usa
  las generadas `img/playa/estilo-*.jpg`). La ropa de día va en una lista corta.


## v7 (7-oct) · Beach Trip, claro y fácil
- **Logo Beach Trip** (el que mandó Daniel) redibujado en vector dentro de la app: login, encabezado e íconos `icon-192/512.png`.
  Si se guarda el original como `public/img/logo.png`, la app lo usa sola.
- **Solo tema claro** (se quitó el modo oscuro y el botón día/noche). Paleta del logo: arena `#FFF9F1`, mar `#0A7FC0`,
  turquesa `#14BDB6`, atardecer `#FF7A2F`, sol `#FFC43D`, texto azul noche `#0B2547`.
- **Inicio con 4 botones grandes**: Gasto · Plan · Comida · Fotos.
- **La casa real** (Airbnb 49074368): departamento en planta baja del Condominio Alcazaba del Río, Casablanca (Same),
  3 habitaciones (2 y 4 camas individuales en literas + principal), 2 baños, piscina, jacuzzi y 10 gradas a la playa.
  ⚠️ **El Airbnb dice 8 huéspedes y el grupo es de 13 o más.** Además no tiene detector de humo ni de monóxido.
- `sql/005_beach_trip_casa.sql`: nombre "Beach Trip" + datos de la casa en `config.viaje` (mezcla, no borra).

## v6 · tareas solas, causación AERO, logística
- **Tareas sin estados manuales**: el estado sale solo (`estadoAuto`): con responsable = en curso; checklist completo
  o marcada = lista. "Repartir con IA" asigna por especialidad (`perfil.superpoder`) y carga.
- **Causación como AERO, sin lo contable**: cuadre subtotal + IVA = total, duplicados (RUC + número, o comercio + fecha + monto),
  memoria por comercio (categoría, alcance y etiquetas propuestas por el historial), XML y clave de acceso del SRI,
  y pregunta "¿por qué?" si un gasto pasa el presupuesto.
- **Equipo** (parlante, micrófonos, proyector, juegos, coolers, trípode) y **Carros** (puestos y maletas, con cupo en la base).
- Imágenes vintage de playa: `node scripts/generar-imagenes.mjs` en la Mac (Gemini o Vertex). Van a `public/img/playa/`.
  Mientras no estén, la app muestra íconos.
- `sql/004_logistica_y_aprendizaje.sql`.

## Qué hay desde v3 (todo probado en navegador a 390 px, como invitado y como admin)

| Sección | Qué hace |
|---|---|
| **Invitación** | Admin genera la clave de 4 dígitos y el mensaje de WhatsApp: link, cédula, clave y lo que encuentran (gastos primero). "Invitar a los que no han entrado" arma todos los mensajes de una. El teléfono recuerda la cédula. |
| **Hoy** | Portada con la foto de la casa, cuenta regresiva, **Lo esencial** (la casa, cómo llegar, WiFi, qué llevar, reglas, contactos, preguntas), mi saldo, la noche temática, lo que se come, álbum, mis tareas. |
| **Gastos (Splitwise)** | Cada gasto dice *prestaste* o *debes*. Tus cuentas, saldos con el mínimo de transferencias, costo fijo del grupo vs consumo de algunos, **presupuesto vs real** (casa 1.300–1.500, despensa 700–1.000), galería de **facturas**, detalle de factura (comercio, RUC, ítems, IVA, propina). |
| **Menú** | Carta por día: **desayuno dual** (A healthy / B tradicional), **almuerzo costeño de la cocinera**, **cenas colaborativas** de cada noche, y de todos los días: café pasado (cero soluble), fruta, **ceviche bar**. Voy / No voy, elegir A o B, pedir variante, alertas de alérgenos por persona (Alegría: conchas y mariscos oscuros), completar plato con IA, foto del plato, **lista de compras** por pasillo que se vuelve tarea. |
| **Planes** | Itinerario por día como app de crucero: *Ahora y lo siguiente*, línea de tiempo con comidas y actividades, paleta de la noche, **Mi agenda**, *Me apunto*. **Dress code** con paleta, ideas e inspiración subida por el grupo. Propuestas con votos. |
| **Tareas** | Prioridad, checklist, "Yo me encargo". Una frase dictada se parte en tareas y se asocia a su noche. |
| **Álbum** | Fotos del viaje por día y por noche, visor, cada quien borra las suyas. Fichas de invitados con restricciones, talento (sale en el programa del Talent Show), preferencias, Instagram. |
| **Admin** (engranaje arriba) | Invitados como app de bodas: cuántos entraron, faltan, fichas listas, filtros y recordatorio. Lo esencial con **Llenar con IA** (pegar texto del Airbnb o del dueño). Menú base. Presupuesto. Respaldo. |

**Modo demo** = cada teléfono guarda sus datos. Daniel: celular `099 000 0001`, clave `1001`; invitados `099 000 0002`…`099 000 0008` (clave = su cumpleaños de ejemplo, se ve en Admin).

## Publicar (Mac de Daniel, 1 minuto)
```
cd ~/marea && git pull && scripts/deploy.sh
scripts/deploy.sh wrangler.dominio.toml     # una vez, para marea.fieldbuil.ai
```

## Conectar Supabase fieldbuilt-lab (para que todos compartan los datos)
1. SQL editor: `sql/001` → `002` → … → `009` (en ese orden; se pueden repetir).
2. Project Settings → Data API → Exposed schemas → agregar `marea`.
3. En `public/index.html` pegar `SB_URL` y `SB_ANON`, subir `BUILD_TAG`, `scripts/deploy.sh`.
4. `scripts/funciones.sh` (necesita el `.env`): despliega `marea-admin-personas`, `marea-leer-gasto` (facturas con Claude), `marea-menu` (fichas de platos) y `marea-info` (lo esencial).

Validado en Postgres 16 local: los 8 SQL corren dos veces sin error, 20 tablas en `marea`, 0 en `public`, balances correctos, un invitado no toca la asistencia de otro, no crea comidas ni edita el presupuesto, nadie sube a otro a un carro y un carro lleno no recibe más (`tests/sql/`). Pruebas de navegador en `tests/e2e-*.mjs`.

## Pendiente
- **Airbnb**: este entorno no puede abrir airbnb.cl ni a0.muscache.com (política de red). Las fotos de la casa se suben desde Admin → Lo esencial; la descripción se pega y la IA saca las comodidades.
- Lista de invitados cerrada en 8 (ver v8).
- Imágenes: hay que correr `scripts/generar-imagenes.mjs` en la Mac (aquí no hay credenciales de Google).
- Fotos de la casa: guardarlas como `public/img/casa/{sala,terraza,cuarto,playa}.jpg` o subirlas en Admin → Lo esencial.
- Teléfonos: Daniel mandó los de Naty Vásquez y Dome (los otros 3 contactos no están en la lista de 8). **No van al repo, porque es público.** Se cargan en Admin al crear cada invitado con su cédula.
- Realtime (hoy refresca cada 45 s), varios pagadores por gasto.

## Le toca a Daniel
- [ ] `scripts/deploy.sh` y amarrar marea.fieldbuil.ai
- [ ] Fechas reales del viaje (Admin → El viaje)
- [ ] Conectar Supabase (pasos de arriba)
- [ ] Celular y cumpleaños de los 8 en Admin, y enviar las invitaciones
- [x] Collages de los 3 looks en `public/img/looks/` (v10)
- [x] Fotos del condominio sacadas del video de @sameclubcasablanca (v11: piscina, playa, jardines). Faltan las de adentro del departamento.
- [x] Cupo: son 8 invitados y el Airbnb es para 8
- [ ] Poner el repo en privado (GitHub → Settings → Make private)

## v31 · cara de Kevin
- `public/img/gente/kevin-lopez.jpg` (foto que mandó Daniel, recortada 400×400). Sale sola en el perfil, eventos y gastos si el invitado se llama «Kevin López».
- Kevin se crea como invitado desde la app (Más → Administrar → Invitados): celular 0988441247, cumpleaños 18/06 → su clave es 1806.

## v32 · cámara con IA en el inicio
- Tarjeta «Foto de la factura» (borde y estrella con los colores de Gemini): abre la cámara del celular (`capture=environment`), pone la foto en la hoja de registrar y la IA la lee sola (`camaraIA`). Si la IA no está conectada, deja la foto y pide escribir el valor.
- Debajo, «O cuéntaselo a la IA» abre la hoja de siempre (`.iac-mas`).

## v33 · se entra SOLO con el celular (Daniel: «para no enredarnos»)
- Login sin clave. La acción pública `entrar` de `marea-admin-personas` busca el celular en `personas` (activo), le crea la cuenta si no la tiene (`asegurarCuenta`) y devuelve la sesión (magic link verificado del lado del servidor) → el front hace `setSession`.
- El cumpleaños queda opcional al crear o editar invitados; el WhatsApp dice «entras solo con tu celular, sin clave».
- Cualquiera que sepa el celular de un invitado puede entrar como él: aceptado por Daniel (app de un viaje entre amigos).
- Para que funcione hay que volver a desplegar la función: `scripts/conectar.sh`.

## v34 · los 8 viajeros con su celular
- `sql/014_viajeros.sql`: Daniel, Ana Paula, Alegría, Kevin, Domenika, Natalia, Ana Cristina y Jhon Cevallos (nuevo). A quien ya estaba sin celular se le pone; no duplica (probado dos veces en Postgres local). Amelia Camacho no venía en la lista.
- `caraDe` también prueba los dos primeros nombres (Ana Paula Ribadeneira → img/gente/ana-paula.jpg).
- Se aplica con `node scripts/conectar.mjs` (o `scripts/conectar.sh`).

## 015 · el guard dejaba por fuera al servidor (bug de Kevin)
- Al entrar solo con el celular salía «solo el admin puede cambiar ese campo»: la Edge Function (llave de servicio) no podía anotar `auth_id`, porque `es_admin()` mira `auth.uid()`.
- `sql/015_guard_permite_servidor.sql`: el guard deja pasar a la llave de servicio, a la conexión directa (sin API) y al admin; un invitado sigue bloqueado (probado en Postgres local).
- Se aplica con `node scripts/conectar.mjs`.

## Publicación automática (GitHub Actions)
- `.github/workflows/publicar.yml`: cada push a `main` aplica los SQL nuevos (`conectar.mjs --ci`), despliega `marea-admin-personas` y publica la página; al final verifica el `BUILD_TAG` en casablanca.fieldbuil.ai.
- `conectar.mjs` ahora anota cada SQL en `marea._migraciones` y no lo vuelve a correr (la primera vez re-aplica los 15, todos idempotentes). **Regla: un cambio nuevo a la base = un archivo nuevo, nunca editar uno ya aplicado.**
- Secretos que Daniel pone en GitHub: `SUPABASE_ACCESS_TOKEN` y `CLOUDFLARE_API_TOKEN`. Los secretos del Worker (SB_URL, SB_ANON, GOOGLE_SA_B64) siguen en Cloudflare y el deploy no los toca.

## IA · diagnóstico del 9-oct
- El robot (paso 0) mostró: publicada la **v33** y `/api/ia/salud` → `motor:null`: **el Worker no tiene NINGUNA llave de IA** (nunca se corrió `scripts/ia.sh`). Por eso la cámara no leía la factura.
- Ahora la llave se puede poner desde GitHub (secreto `GOOGLE_SA_JSON` o `GEMINI_API_KEY`): el robot la pasa al Worker en cada publicación (paso 3a). Necesita también `CLOUDFLARE_API_TOKEN`.
- `/api/ia/salud?probar=1` hace una pregunta real al modelo y devuelve el error exacto si falla (pasos 0 y 5 del robot).

## v35 · factura desde el carrete + subir fotos en el inicio · sin Ana Cristina
- «Foto de la factura» con dos botones: **Tomar foto** (cámara) y **Del carrete** (galería).
- Debajo: «Subir fotos del viaje» (varias al álbum, `elegirFotos`).
- La IA quedó conectada el 9-oct con `GEMINI_API_KEY` puesta por Daniel en Cloudflare (motor gemini, gemini-2.5-flash).
- `sql/016_sin_ana_cristina.sql`: Ana Cristina Grijalva (0992834833) inactiva, no se borra. 014 ya no la crea en una base nueva.

## v36 · la IA desglosa los platos, pregunta y reparte; avisos push; chat en el inicio
- **Reparto por platos** (`platosSec`/`recalcPlatos`): cada ítem de la factura con su precio y las caras de quién lo pidió (toque); lo no marcado es «de todos»; IVA, servicio y propina se reparten en proporción a lo consumido; cuadra al centavo (el redondeo cae en la parte mayor). Se guarda como `reparto.modo='monto'` + `factura.items[].para_ids`. Se activa solo cuando la factura trae ≥2 ítems con precio y es restaurante/bar (o la IA marcó quién pidió qué); «+ Agregar plato» y precio editable.
- **La IA pregunta** (`.ia-preg`): las `dudas` son preguntas concretas; si no leyó el total, la pregunta grande «¿Cuánto fue en total?» con el monto inline (`fMontoOk`). El sello muestra el `resumen` de la IA.
- Worker: `factura.items[].para_ids` en el esquema y en `limpiar`; reglas 11 (desglose, quién pidió qué, servicio/propina no son ítems) y 12 (dudas = preguntas, máx. 3).
- **Avisos push** (RFC 8291): `sql/017_avisos_push.sql` (`push_subs`, `push_vapid`, solo service_role), Edge Function `marea-avisar` (vapid/guardar/quitar/enviar; crea la pareja VAPID sola; borra el teléfono a los 3 fallos o 404/410), `sw.js` (push + notificationclick → la pestaña del hash). Front: tarjeta «Recibir avisos» en el inicio (iPhone solo instalada), `sincronizarPush` al entrar, `avisar()` tras: gasto nuevo (a cada participante con lo que le toca), pago (al que cobra), tarea asignada, plan nuevo, mensaje del chat.
- Inicio: acceso rápido al **Chat del grupo** con el último mensaje.
- Se quitó el robot de GitHub (`.github/workflows`): Daniel no va a poner llaves ahí. Se publica con `scripts/listo.sh`, que ahora también sube las dos funciones.

## v37 · álbum en el inicio
- `albumCard()`: debajo de la factura, «Álbum del viaje» con las últimas 6 fotos (tocar → `verFoto` en grande, con autor, anterior/siguiente), «Ver todo» y botón grande «Subir fotos» (varias). Reemplaza al botón suelto de v35.
- IA: Google ya entrega llaves `AQ.…` además de `AIza…`; el worker lee cualquier llave guardada en Cloudflare (se llame como se llame) y si una da 402 (sin saldo) prueba la siguiente. El saldo prepago de AI Studio de Daniel (COP 60.000 del 8-oct) sigue sin aplicarse a la API: la llave buena es la del proyecto nuevo (`casablanca`).

## v38 · reparto como lo pidió Daniel: la IA desglosa, uno toca o explica
- La IA desglosa **toda** factura (regla 11, no solo restaurantes); «por platos» se activa con ≥2 productos con precio.
- En la sección «¿Quién pidió qué?»: tocar caras **o** escribirle a la IA («el bloqueador es de Ana Paula y las cervezas mías y de Alegría») → `repartirConIA` manda `items_actuales` al worker (regla 11b) y la IA devuelve los mismos ítems con `para_ids`; se cruzan por nombre.
- Si la IA no desglosó: botón «Desglosar los productos con IA» (`desglosarConIA`, reenvía la foto).
- Atajos arriba de las caras: **Para todos** · **Todos excepto…** (se tocan las caras de quien no va; el encabezado dice «todos excepto Kevin») · **Por platos**.
- Inicio: al final, «Sube tus fotos al álbum» (varias a la vez).

## v39 · versión a la vista y botón Actualizar
- Pie del inicio: «Versión vNN · Buscar actualización». `/api/version` (worker) lee `marea-vNN` del sw.js publicado; `revisarVersion()` al entrar, al volver a la app y cada 5 min; si hay una más nueva sale el banner «Hay una versión nueva · Actualizar». `actualizarApp()` desregistra el SW, borra cachés y recarga con `?v=`.
- 9-oct: IA confirmada funcionando con la llave `casablanca` (gemini).

## v40 · cabecera y Más
- Logo de la cabecera interior más grande y nítido (118 → ~73 px de alto). En «Más»: fuera el sticker que se salía; entra el álbum con «Subir fotos» debajo del título.
- El botón flotante «+» ya no sale en el inicio (tapaba «Del carrete»).

## v41 · «Tomar foto» en la barra de abajo
- Botón de cámara (círculo con los colores de Gemini) entre Hoy e Itinerario: abre la cámara y manda la foto a la IA en modo `auto` (factura → gasto; foto del grupo → álbum; `camaraIA(inp,'auto')`).

## v42 · lectura de facturas rehecha desde cero (Daniel: «no pude leer los productos… hazlo bien desde 0»)
- **Paso A · lector dedicado** (`leerRecibo`, `SISTEMA_RECIBO`, `ESQUEMA_RECIBO` chico y plano, temperatura 0): solo lee lo impreso: ítems con total de línea, subtotal, IVA, servicio, propina, total, comercio, RUC, fecha; `es_comprobante=false` si la foto no es un comprobante. Servicio y propina se suman en `propina` (se reparten en proporción).
- **Paso B · intérprete** (el prompt de siempre) recibe el recibo YA LEÍDO como dato fijo (sin la foto) y decide quién pagó, para quién, categoría, plan.
- **El recibo manda**: si el intérprete pierde ítems, cambia el total o no arma gasto, se corrige con lo leído; si el intérprete falla del todo, `gastoDesdeRecibo` arma el gasto igual (categoría por palabras clave, pagó quien escribe, para todos). Dudas automáticas: total ilegible, quién pidió qué, y «los productos suman X y la factura dice Y».
- `consultar()` concentra los respaldos (otra llave si 402, otro modelo si 404, sin esquema si 400) y el JSON de forma explícita cuando va sin esquema (`FORMA_RECIBO`, `FORMA_PROPUESTA`).
- `modo:'items'` = solo el desglose (botón «Desglosar los productos con IA»). La respuesta trae `diag` (modelo, ítems leídos, confianza) para depurar sin exponer nada.

## v43 · cuentas claras (Daniel: «lo de Naty está raro, calcula fácil como Splitwise»)
- «Mis cuentas» ya no muestra el plan simplificado (que ruteaba deudas de terceros y confundía: Naty «debía» más a Alegría de lo que compartieron). Ahora `deudasDirectas(me)`: con cada persona, lo que de verdad se deben por los gastos compartidos (yo pagué → me debe su parte; ella pagó → le debo la mía; los pagos entre los dos restan). La suma cuadra con el saldo total (probado).
- Tocar a alguien → `verDeuda`: gasto por gasto (quién pagó, qué parte, verde/rojo), total, y «Pagarle… y registrarlo» / «Ya me pagó: registrar».
- El plan de mínimas transferencias sigue en «Ver cómo se calculó» (vBalances).

## v44 · quién le debe a quién (clarísimo) · fotos en grande en todas partes · una factura = un gasto
- **Saldos**: explicación de una línea («como en Splitwise»), luego **Quién le debe a quién**: por deudor, cada persona a la que le debe y cuánto (`deudasGrupo`: deudas directas de todo el grupo, cuadran con los saldos), tocar → `verDeuda(a, desde)` gasto por gasto entre dos personas cualesquiera, botón «Pagado». Saldo de cada uno con leyenda. El plan simplificado queda plegado abajo como «Atajo para el final» con su explicación.
- **Fotos**: visor a pantalla completa `verImagen(src, título)` (fondo oscuro, ✕, «Abrir en grande»): foto de la factura en la confirmación y en el detalle del gasto, foto del evento (toque sobre la cabecera, `zoomEvento`), chat (`verLook`). Si el gasto no tiene foto: «Agregar foto de la factura» ahí mismo.
- Worker: con comprobante leído, UNA factura = UN gasto (si el intérprete la parte en dos, queda el primero) y nunca va al álbum. Front: dedupe por descripción+monto por si acaso.

## v45 · el botón de abajo es solo para el álbum
- «Fotos al álbum» en la barra (entre Hoy e Itinerario): abre cámara o carrete, varias fotos, directo a la hoja de subir al álbum (`elegirFotos`). Sin IA. Las facturas van por «Foto de la factura» en el inicio.

## v46 · el look de cada noche: «Armar mi outfit con IA» en vez de «Subir inspiración»
- En cada look (Itinerario → Dress code) se quitó la caja «Subir inspiración» (las fotos que ya hubiera se siguen viendo). Entra el botón «Armar mi outfit con IA» → hoja con la paleta, «Para ella / Para él», cajita opcional «lo que ya tienes en la maleta» y «Armar mi outfit» / «Otra idea».
- Worker: `modo:'outfit'` (`outfitDe`, `SISTEMA_OUTFIT`, esquema chico) → `{titulo, piezas:[{parte, idea}], tip}`; temperatura 0.8 para que «Otra idea» cambie. Sin IA o si falla, `outfitLocal` arma uno con las ideas del look.

## v47 · alerta de salida + «Todo del viaje» + arte con IA
- **Alerta de salida** en el inicio (`salidaCard`): sale 48 h antes y hasta 3 h después: «🚗 ¡Nos vamos a Same! · Hoy · 8:00 a.m. · 📍 Salimos desde Cumbayá · casa de la Ale · ⏰ en 6 h 20 min», con «Cómo llegar» y «Todo del viaje». Datos editables por el admin en Lo esencial: `salida_hora`, `salida_lugar`, `salida_mapa` (por defecto 08:00 y Cumbayá · casa de la Ale; fecha = primer día del viaje).
- **Todo del viaje** (`hojaTodo`, tarjeta fija en el inicio): salida con mapa, el departamento (nombre, dirección para copiar, check-in/out, Google Maps y Waze), fechas, WiFi, contactos y «Mandar todo por WhatsApp».
- **Arte con IA** (`/api/arte/salida` en el worker): ilustración fija de la salida dibujada por Imagen (si hay cuenta de servicio de Vertex) o por los modelos de imagen de Gemini con las llaves guardadas (salta las sin saldo); se guarda en el caché de Cloudflare 30 días. `listo.sh` la dibuja al publicar. Si no se puede, la alerta sale con un degradado de colores.

## v48 · los carros, fotos con IA para el itinerario y el menú, outfit con foto
- `sql/018_carros_salida.sql`: **Lexus de Kevin** (van Alegría, Domenika, Naty, Ana Paula) y **Amarok de Lenin** (copiloto Daniel, atrás Jhon y Esteban), ida y regreso; idempotente (probado dos veces en Postgres local). Las personas se buscan por primer nombre.
- Inicio: «🚗 Los carros» debajo de la alerta de salida (`carrosCard`): cada carro con su ilustración de IA (`/api/arte/lexus`, `/api/arte/amarok`, fijas y cacheadas), Maneja · Copiloto (de la nota «Copiloto: X») · Atrás con caras. También en «Todo del viaje» y en el WhatsApp.
- `/api/arte-gen` (con sesión): dibuja a pedido un **evento** (póster de playa), un **plato** (foto de restaurante gourmet) o un **outfit** (flat lay). Admin: botón «Crear con IA la foto de N planes» en el Itinerario y «… N platos (estilo restaurante)» en el Menú (`crearFotosIA`): genera, sube a `marea-muro` y guarda en `eventos.foto` / `platos.foto` para todos. Outfit: «Ver cómo se ve (foto con IA)».
- `listo.sh` dibuja salida, lexus y amarok al publicar.

## v49 · día de salida: bienvenida, votación del almuerzo, mapa de la casa de la Ale
- `sql/019_bienvenida_almuerzo.sql` (idempotente, probado): `info.salida_mapa` = https://maps.app.goo.gl/Pop3Z1AsiefPjZfPA (casa de la Ale, 8:00); 4 opciones de almuerzo de camino como propuestas con tematica «Almuerzo de camino» (directo al ceviche de la casa, encocado en Esmeraldas, mariscos en Atacames, típico en La Concordia); mensaje de bienvenida en el chat de parte del admin.
- Inicio: `bienvenidaCard` (bienvenidos, el ceviche que espera, «todo gasto va a la app» con botón Registrar un gasto; se cierra y vale desde el día antes hasta el final del viaje) y `votoAlmuerzoCard` (un voto por persona, barras y caras, «+ Otra opción», admin «Elegir la ganadora» → la vuelve oficial y avisa a todos por push).

## v50 · la plata sin dudas y las caras que se abren (9-oct-2026)
- Daniel: «en plata no puede haber dudas». Se quitó el «Atajo: cerrar con menos transferencias»
  (el plan simplificado ponía a todos a pagarle a Alegría y confundía). Saldos y el Resumen del
  viaje muestran SOLO deudas directas («X le debe a Y», `deudasGrupo()`), que salen de los gastos
  compartidos entre esas dos personas.
- Nuevo «De dónde sale: cada gasto» (`desgloseGastos()`): por gasto, quién pagó, fecha y la parte
  de cada persona con su cara. Tocarlo abre el gasto.
- Saldo con signo claro (`saldoTxt`): +$ le deben, −$ debe.
- Toda cara (`av()` lleva `data-p`) abre la foto en grande con un clic (escucha global en captura),
  salvo en los selectores (.avp, .pl-av), donde tocar la cara sigue eligiendo a la persona.
- Pruebas: tests/e2e-plata-v50.mjs, e2e-saldos, e2e-cuentas.

## v51 · el viernes perfecto, juegos, karaoke y Dashboard (9-oct-2026, madrugada)
- **sql/020_dia1_juegos_karaoke.sql** (correr con `scripts/listo.sh`):
  - viernes 9: 08:00 Salida desde la casa de la Ale · ≈12:30 almuerzo de camino (votación) · 15:00 Llegada con ceviche ·
    15:45 Check-in y cuartos · 16:30 Micheladas en la playa · 17:50 Atardecer y foto de grupo · 20:00 Cena noche de estrellas y fogata
    («Llegada y check-in» y «Círculo de intenciones» se renombran: conservan id, votos y foto).
  - fuera las 4 opciones de almuerzo que traía la app; los carros se llaman «Lexus» y «Amarok» (sin dueño).
  - tablas nuevas con RLS: `juegos`, `juego_respuestas`, `karaoke`, `votos_juego`.
- **Mi día** (inicio): el plan de hoy (o de mañana) con hora, foto y «Ahora / En 23 min», tu carro y quién maneja,
  y la fila del almuerzo que lleva a la votación.
- **Votación del almuerzo**: sin opciones de fábrica; un ejemplo gris y cada quien escribe la suya (no duplica, un voto por persona).
- **Carros**: foto (IA) de la Lexus blanca y la Amarok blanca, «Maneja», «Copiloto», «Atrás», y «Tu carro».
  Arreglado: los conductores ya no salen como «sin puesto».
- **Itinerario**: tarjetas con la foto grande, la hora encima y la descripción (antes la columna de la hora lo aplastaba).
- **Gastos → Dashboard** en lugar de Presupuesto: total, por persona, hoy, en qué se va, por día, quién ha pagado,
  lo que le toca a cada uno y los gastos más grandes. Ya no avisa «pasa el presupuesto».
- **Sin botones de IA para imágenes**: `worker/arte.js` es un catálogo fijo (carros, salida, cada plan, juegos,
  12 actividades, looks él/ella, platos sin foto). `GET /api/arte` da la lista; `/api/arte/<clave>` dibuja una vez y
  queda en el caché de Cloudflare (y en el teléfono, vía sw.js). `listo.sh` las pide todas al publicar. Modelos de imagen:
  primero los baratos (flash), el «pro» al final.
- **Juegos** (Más → Juegos y tarjeta en el inicio), en vivo en todos los teléfonos (sondeo cada 2 s):
  trivia tipo Kahoot (5 temas + «Nosotros» con datos del viaje, 4 colores, puntos por rapidez, podio),
  «¿Quién es más probable que…?», karaoke (`/api/canciones` → iTunes: portada y 30 s de muestra; fila, subir/quitar,
  «Ahora canta», letra en YouTube, aviso «te toca cantar») con **premios** después de cantar, y 12 actividades de playa
  con «¡Juguemos!».
- Sin zoom con doble toque (`touch-action: manipulation` + viewport).
- **Publicar sin la Mac**: la página se puede publicar sola conectando el repo en Cloudflare
  (Workers & Pages → marea → Settings → Builds → Connect → GitHub `danielm145/marea`, rama `main`,
  comando de deploy `npx wrangler deploy --config wrangler.dominio.toml`). Los cambios de base (sql/) siguen
  necesitando `scripts/listo.sh`. Se intentó una función que aplicara el SQL desde la app y se descartó por seguridad.
- Pruebas: tests/e2e-juegos.mjs (dos teléfonos a la vez), e2e-voto, e2e-carros, e2e-outfit, e2e-portadas,
  worker-ia (31). Siguen rotas desde antes (igual en v50): album, comida-y-planes, gasto-ia, invitados, logistica,
  planes-ia, programa-4-dias.

## v52 · liquidar, juegos de carro, desayunos, carros y looks con Insta (9-oct-2026)
- **Liquidar con menos transferencias** (al final de Saldos → «Ver cómo liquidar y por qué»): `abrirLiquidar()` usa
  `simplificar()` y lo explica en 3 pasos: el saldo de cada uno, las transferencias (cada una con su «por qué» y
  «Ya se hizo: registrar este pago» → `registrarPago`) y la comprobación de que todos quedan en $0. Se manda por WhatsApp.
  «Quién le debe a quién» sigue arriba: los dos caminos dan lo mismo.
- **Juegos de carro** (Juegos → Carro): Stop, ¿Qué prefieres?, Yo nunca nunca, Verdad o reto (el que maneja no hace
  retos), Adivina el personaje, Tararea la canción, Bingo de carretera y Placas de las 24 provincias. Todo vive en el
  celular (bingo y placas se guardan en el teléfono): funcionan con y sin internet, aunque no carguen las tablas.
- **Canciones para el karaoke**: lista de 40 clásicas con votos (`votos_juego`, clave `ksug:<canción>`); la más votada
  sube y «Pedir» la manda a la fila (busca la portada en iTunes si hay señal).
- **sql/021_desayunos_carros_looks.sql**: desayuno costeño todos los días (bolón = A, tigrillo = B; en la mesa:
  ceviche de camarón y pescado, fruta picada todo el día, jugo de naranja colado, jugo de coco, yogurt con arándanos;
  se dejó el café). Carros: Daniel maneja el Lexus con las chicas; la Amarok, los chicos (maneja Lenin; van Kevin,
  Jhon y Esteban). Tabla nueva `look_guias` (clave = nombre del look, descripción y la guía de la IA).
- **Looks · Inspiración de Insta**: cada look tiene «Subir fotos» (varias), un cuadro para describir la idea y la guía
  de la IA (modo `guia` en `/api/ia`: mira hasta 6 fotos + la descripción y devuelve resumen, colores, piezas para él y
  para ella y tips). Se arma sola al subir fotos y se puede volver a armar. Sin IA, queda una guía con el look.
- Pruebas: tests/e2e-v52.mjs, worker-ia (32).

## v53 · revisión de la noche antes de salir (9-oct-2026)
- **Sin señal**: lo último cargado queda en el teléfono (`marea_cache_v1`), también la conexión pública a la base
  (`marea_sb`) y la lista de imágenes (`marea_arte`). Si no hay señal, la app abre con los datos reales guardados y un
  aviso amarillo; los juegos de carro funcionan completos. Al volver la señal se recarga sola. Antes: sin señal salía
  la pantalla de entrada o, peor, los datos de ejemplo.
- **Errores reales arreglados**: «Agregar plato» fallaba (la ficha usaba `window.PL` y la app leía otra `PL`); la hoja
  de fechas del viaje leía la variable de votos de los juegos (`VJ` → ahora `VOTJ` en juegos y `VIAJEF` en la hoja);
  en Carros los conductores salían «sin puesto».
- Portada: el día del viaje dice «Día 1 de 4 · ¡nos vamos!». Pestañas que no se salen en celulares de 320-360 px.
- Las fotos de IA de carros y salida solo se piden si existen en el catálogo.
- **Prueba nueva con la base de verdad simulada**: `tests/e2e-supabase.mjs` corre la app en modo Supabase contra
  `tests/mock-supabase.js`, que rechaza cualquier columna que no esté en `tests/esquema-marea.json` (sacado de Postgres
  con todos los sql/). Cubre almuerzo, pagos, trivia, ¿quién es más probable?, karaoke y premios, guía de looks,
  chat, asistencia, platos, tareas, carros, votos, gasto leído por la IA, álbum, Insta y el modo sin señal.
  Si cambia la base: regenerar `esquema-marea.json`.
- Pruebas viejas puestas al día (selectores nuevos): comida-y-planes, gasto-ia, logistica, planes-ia, programa-4-dias.
- v54: «Tu carro de regreso» en Mi día el último día; ícono de respaldo en las actividades de playa si la imagen
  no está; «Terminar la partida» para quien conduce la trivia o ¿quién es más probable?; prueba del álbum al día.
- v55: visor de fotos con «toca para acercar» (facturas, álbum, looks), la foto del álbum abre el visor; freno de la IA
  a 100 por IP cada 10 min (todos salen por el WiFi de la casa); textos viejos de presupuesto fuera.
- v56: «Probar avisos en este celular» (Más): la función `marea-avisar` tiene la acción `probar`, que manda un aviso a
  ESE teléfono; así se comprueba en segundos que los avisos llegan. Se sube con `scripts/listo.sh`.
- `listo.sh` termina con «5/5 · Revisión final»: versión publicada, catálogo de imágenes, buscador de canciones y
  tablas nuevas en la base, con ✓ o ✗.
- v57 (Daniel ya publicó; el karaoke funciona): «Sigue en cantar» en grande con portada, canción, artista y caras de
  quienes cantan; la fila de después también con portada. Las canciones escritas a mano o pedidas de la lista buscan
  su portada en iTunes solas (al pedirlas y, si faltara, al abrir el karaoke) y la guardan.
- v58: el carro es una **Lexus GX 460** blanca: imagen nueva (`carro-lexus-gx460`, `salida-gx`; clave nueva = se dibuja
  de nuevo), nombre en la app y `sql/022_lexus_gx460.sql` (renombra el carro en la base).
