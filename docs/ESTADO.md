# Estado · Casablanca (antes Beach Trip y Marea Alta)

> Lo primero que lee quien retome. Última actualización: **7-oct-2026 · v22**.

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
