# Estado · Beach Trip (antes Marea Alta)

> Lo primero que lee quien retome. Última actualización: **7-oct-2026 · v7**.

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

**Modo demo** = cada teléfono guarda sus datos. Daniel: cédula `100000001`, clave `2026`; invitados `100000002`…`100000013`.

## Publicar (Mac de Daniel, 1 minuto)
```
cd ~/marea && git pull && scripts/deploy.sh
scripts/deploy.sh wrangler.dominio.toml     # una vez, para marea.fieldbuil.ai
```

## Conectar Supabase fieldbuilt-lab (para que todos compartan los datos)
1. SQL editor: `sql/001` → `002` → `003` → `004` → `005` (en ese orden; se pueden repetir).
2. Project Settings → Data API → Exposed schemas → agregar `marea`.
3. En `public/index.html` pegar `SB_URL` y `SB_ANON`, subir `BUILD_TAG`, `scripts/deploy.sh`.
4. `scripts/funciones.sh` (necesita el `.env`): despliega `marea-admin-personas`, `marea-leer-gasto` (facturas con Claude), `marea-menu` (fichas de platos) y `marea-info` (lo esencial).

Validado en Postgres 16 local: los 5 SQL corren dos veces sin error, 20 tablas en `marea`, 0 en `public`, balances correctos, un invitado no toca la asistencia de otro, no crea comidas ni edita el presupuesto, nadie sube a otro a un carro y un carro lleno no recibe más (`tests/sql/`). Pruebas de navegador en `tests/e2e-*.mjs`.

## Pendiente
- **Airbnb**: este entorno no puede abrir airbnb.cl ni a0.muscache.com (política de red). Las fotos de la casa se suben desde Admin → Lo esencial; la descripción se pega y la IA saca las comodidades.
- Lista de invitados nueva: dos Kevin (Kevin y Kevin López), **Luciana** (no Luciano), **Grijalba**. Natalia Villar sigue aunque no venía en la última lista. Vanesa y John se agregan desde Admin si van.
- Imágenes: hay que correr `scripts/generar-imagenes.mjs` en la Mac (aquí no hay credenciales de Google).
- Fotos de la casa: guardarlas como `public/img/casa/{sala,terraza,cuarto,playa}.jpg` o subirlas en Admin → Lo esencial.
- Teléfonos: Daniel mandó 5 contactos (Naty Vásquez, Dome, Jhon, Mony Flores y uno guardado como «Mejora»). **No van al repo, porque es público.** Se cargan en Admin al crear cada invitado con su cédula.
- Realtime (hoy refresca cada 45 s), varios pagadores por gasto.

## Le toca a Daniel
- [ ] `scripts/deploy.sh` y amarrar marea.fieldbuil.ai
- [ ] Fechas reales del viaje (Admin → El viaje)
- [ ] Conectar Supabase (pasos de arriba)
- [ ] Cédulas y WhatsApp de los invitados, y enviar las invitaciones
- [ ] Fotos de la casa (la descripción ya está)
- [ ] Confirmar cupo: el Airbnb es para 8 personas
- [ ] Poner el repo en privado (GitHub → Settings → Make private)
