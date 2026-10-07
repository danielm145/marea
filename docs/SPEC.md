# SPEC · Marea Alta — la app del viaje a la playa y sus noches temáticas

*Especificación autocontenida para el agente que construye. Escrita el 2026-10-07 por la
sesión de planeación. Todo lo que dice `[DANIEL]` es un dato que falta: hacerlo
configurable, no inventarlo.*

- **Nombre:** Marea Alta · *Playa de día, temática de noche*
- **URL:** https://marea.fieldbuil.ai (worker Cloudflare `marea`; respaldo
  `marea.daniel-martinez9094.workers.dev`)
- **Idioma:** español. **Moneda:** USD por defecto (`config.viaje.moneda`), 2 decimales.
- **Usuarios:** 12 invitados (lista en § 2). Entran con cédula + PIN de 4 dígitos.

---

## 1 · Arquitectura

```
public/index.html         ← TODA la app (login, pestañas, gastos, tareas, eventos, nosotros, admin)
public/sw.js              ← service worker red-primero (ya escrito)
public/manifest.webmanifest, icon-192.png, icon-512.png, _headers
sql/001_esquema.sql       ← tablas, RLS, vistas, storage, semilla (ya escrito)
supabase/functions/marea-admin-personas   ← crear invitados / PIN / WhatsApp (ya escrita)
supabase/functions/marea-leer-gasto       ← IA: foto o texto → propuesta (ya escrita)
scripts/deploy.sh, scripts/funciones.sh
tests/*.spec.ts           ← Playwright, como invitado y como admin
docs/SPEC.md (este), docs/ESTADO.md (bitácora para Daniel)
```

- Supabase JS v2 por CDN (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`).
  `SUPABASE_URL` y `SUPABASE_ANON_KEY` van **escritas en el HTML** (son públicas por diseño;
  la seguridad es RLS). La service role **jamás**.
- **Proyecto compartido `fieldbuilt-lab`**: el cliente se crea con
  `createClient(URL, ANON, { db: { schema: 'marea' } })`; todas las tablas y vistas están en
  el esquema `marea`. Para que la API lo sirva, en el dashboard: Project Settings → Data API
  → **Exposed schemas** → agregar `marea` (una sola vez; el agente lo anota en ESTADO.md si
  no tiene acceso al dashboard). Buckets: `marea-respaldos`, `marea-perfiles`, `marea-muro`.
  Edge Functions: `marea-admin-personas`, `marea-leer-gasto`. Email de Auth: `<cedula>@marea.local`.
- Estado global en JS: `SESSION` (persona actual, desde `personas` fila propia),
  `PERSONAS` (desde `personas_publicas`), `CFG` (config.viaje), `GASTOS`, `TAREAS`,
  `EVENTOS`, `ETIQUETAS`. `refreshData()` recarga todo sin reload; **Realtime** de
  Supabase en `gastos`, `tareas`, `eventos`, `votos` para que todos vean los cambios al
  instante (suscripción `postgres_changes`, y al recibir evento → `refreshData()` con
  debounce de 500 ms).
- Navegación: pestañas inferiores (Hoy · Gastos · Tareas · Eventos · Nosotros · ⚙︎ Admin
  solo admin). `switchTab()` con History API para que "atrás" navegue dentro de la app.
- Versionado: `const BUILD_TAG='v1'` visible en el pie. Subirlo en cada deploy.

## 2 · Invitados

| # | Nombre | Apodo sugerido | Rol |
|---|---|---|---|
| 1 | Daniel Martínez | Daniel | **admin** |
| 2 | Ana Paula | Ana Pau | invitado |
| 3 | Alegría | Alegría | invitado |
| 4 | Kevin López | Kevin | invitado |
| 5 | Ana Cristina Grijalva | Ana Cris ❤️ | invitado |
| 6 | Domenika Pérez | Dome | invitado |
| 7 | Natalia Vásquez | Naty | invitado |
| 8 | Amelia Camacho | Amelia | invitado |

> 7-oct-2026: Daniel confirmó que los invitados son SOLO estos 8 (los de las fotos de Instagram). El Airbnb es para 8.

Las cédulas las carga Daniel `[DANIEL]`. Para desarrollo usar cédulas de prueba
`100000001`…`100000008` y **borrarlas** antes de entregar (dejar un botón "Eliminar
cuenta de prueba" o un SQL `sql/999_limpiar_pruebas.sql`). La UI muestra apodo si existe,
si no nombre + inicial del apellido cuando hay repetidos.

## 3 · Login y sesión

- Pantalla: logo (ola + luna, SVG inline), "Marea Alta", input **cédula** (`inputmode=
  numeric`), input **PIN** (4 dígitos, teclado numérico, `type=password`), botón Entrar.
  Enlace "¿No tienes clave? Escríbele a Daniel".
- `supabase.auth.signInWithPassword({ email: cedula+'@marea.local', password: cedula+'#'+pin })`.
- Tras entrar: `personas` fila propia (`select ... eq('auth_id', uid)`), luego
  `personas_publicas`, `config`, datos. Si la persona está `activo=false` → cerrar sesión
  con mensaje.
- Sesión persistente (Supabase la guarda en localStorage). "Salir" en Nosotros → mi perfil.

## 4 · Gastos (Splitwise)

### 4.1 Modelo de reparto
- `pagadores`: `[{persona_id, monto}]`, suma = `monto`. Normalmente uno.
- `reparto`: `{modo:'igual'|'porcentaje'|'monto', partes:[{persona_id, valor}]}`.
  - `igual`: `valor` se ignora; cada parte = monto / n (redondeo a 2 decimales; la
    diferencia de centavos se la lleva el primer participante).
  - `porcentaje`: valores suman 100 (validar ±0.01).
  - `monto`: valores suman `monto` (validar ±0.01).
- **El front siempre escribe `partes` explícitas** (una por participante) antes de insertar; "todos" se materializa con los activos de `PERSONAS`. La vista cuenta las partes para el modo igual.
- `tipo`: `gasto` (normal) · `pago` (A le transfirió a B: pagadores=[A], partes=[B 100 %],
  modo porcentaje) · `aporte` (A puso plata al fondo común: pagadores=[A], reparto igual
  entre **todos los activos**).
- `fondo=true`: lo pagó el fondo común. **No entra a balances** (ya se repartió al
  aportar); aparece en el libro del fondo (`vw_fondo`).
- Las vistas `vw_gasto_partes` y `vw_balances` ya calculan todo. El front **no recalcula
  balances**; solo pinta `vw_balances` y aplica la simplificación de deudas:

```js
// Mínimo de transferencias (greedy, igual que "simplify debts")
function simplificar(balances){ // [{persona_id, saldo}]
  const deb = balances.filter(b=>b.saldo<-0.009).map(b=>({...b,s:-b.saldo})).sort((a,b)=>b.s-a.s);
  const acr = balances.filter(b=>b.saldo> 0.009).map(b=>({...b,s: b.saldo})).sort((a,b)=>b.s-a.s);
  const out=[]; let i=0,j=0;
  while(i<deb.length&&j<acr.length){
    const m=Math.min(deb[i].s,acr[j].s);
    out.push({de:deb[i].persona_id,a:acr[j].persona_id,monto:+m.toFixed(2)});
    deb[i].s-=m; acr[j].s-=m;
    if(deb[i].s<0.009)i++; if(acr[j].s<0.009)j++;
  }
  return out;
}
```

### 4.2 Pantallas
- **Lista**: tarjetas (fecha · descripción · categoría · "pagó X" · monto · mi parte en
  pequeño). Filtros: persona, categoría, evento, etiqueta, rango de fechas; buscador.
  Totales del filtro arriba. Toque → detalle.
- **Detalle**: todo el gasto, miniatura del respaldo (URL firmada; toque = pantalla
  completa), reparto por persona, historial de cambios (de `gastos_historial`), botones
  Editar / Eliminar (si es mío o soy admin). Eliminar pide confirmación y hace
  `update eliminado=true`.
- **Balances** (pestaña interna): tarjeta por persona (pagó / le toca / saldo con color),
  **"Quién le paga a quién"** con la lista de transferencias y botón **"Ya pagué"** en cada
  una (crea un gasto `tipo=pago` prellenado; confirma antes). Tarjeta del **fondo común**
  (aportado / gastado / disponible) con botón "Registrar aporte".
- **Agregar** (hoja inferior desde el botón ＋ del Home y de Gastos):
  1. **Escribir**: textarea "Cuéntalo como quieras" → `marea-leer-gasto` → formulario prellenado.
  2. **Foto de factura**: `<input type=file accept="image/*" capture="environment">` →
     **redimensionar en el navegador** (canvas, lado mayor 1600 px, JPEG 0.82) → subir a
     `marea-respaldos/<mi_persona_id>/<uuid>.jpg` → `marea-leer-gasto` con `archivo_path` →
     formulario prellenado con la miniatura.
  3. **Manual**: formulario vacío.
- **Formulario** (el mismo para los tres caminos): descripción, monto, moneda, fecha,
  categoría (chips), **quién pagó** (chips de personas, multi; por defecto yo),
  **entre quiénes** (chips, por defecto todos; toggle "todos"), modo de reparto (segmento
  igual / % / montos; si % o montos aparece una fila editable por participante con la suma
  en vivo y en rojo si no cuadra), evento (select), etiquetas (chips + crear), nota,
  respaldo (miniatura o botón para adjuntar), switch "lo pagó el fondo". Campos venidos
  de la IA con `confianza < 0.6` se marcan en ámbar y las `dudas` se muestran arriba.
  Botón **Guardar** deshabilitado hasta que todo cuadre. Al guardar: `insert gastos` con
  `origen` y `lectura_ia`, y la `entrada` pasa a `confirmada`.
- **Exportar**: CSV de gastos (filtro actual) y **Resumen final** (página imprimible:
  totales por categoría y persona, balances, transferencias) con `window.print()`.

## 5 · Tareas

- Kanban horizontal deslizable (Por hacer · En curso · Listo) o lista agrupada en
  pantallas angostas (toggle). Filtros: grupo, responsable, etiqueta, evento.
- Tarjeta: título, grupo (color), responsable (avatar inicial), fecha, progreso de
  subtareas (2/5). Toque → detalle con checklist editable, botón **"Yo me encargo"**
  (pone `responsable = yo`), mover de estado, editar, borrar (mío o admin).
- Agregar: botón ＋ → texto libre ("comprar hielo, carbón y limones para el asado;
  Andrés prende la parrilla a las 7") → `marea-leer-gasto` devuelve `tareas[]` → lista
  confirmable con checkbox por tarea → insert. También formulario manual.
- **Turnos**: en Admin, generador de turnos: elegir días y roles (cocina desayuno, lavar,
  mercado, hielo, basura) → asigna rotando entre activos → crea tareas `grupo='Turnos'`
  con fecha. El Home muestra "Mis turnos de hoy".

## 6 · Eventos y noches temáticas

- **Calendario**: una columna por día del viaje (`config.viaje.desde..hasta`; si están
  en null, mostrar los eventos sin día en "Por programar" y un aviso al admin para cargar
  las fechas). Cada día con bloques mañana / tarde / noche; tarjeta por evento oficial.
- **Propuestas**: lista de `estado='propuesta'` ordenada por votos; botón 👍 (toggle
  insert/delete en `votos`); contador y avatares de quién votó. El admin tiene **"Hacer
  oficial"** (pone `estado='oficial'` y pide día + bloque + hora).
  La semilla del SQL ya trae 16 propuestas.
- **Detalle**: título, temática, día/hora/lugar, dress code, anfitriones (chips; "me
  apunto de anfitrión"), descripción, playlist (link), **lista de lo que hay que
  llevar/comprar** (`eventos.lista`; botón "Convertir en tareas" crea una tarea por ítem
  con `evento_id`), gastos asociados (total), fotos del evento (de `muro` con
  `evento_id`… si no hay tiempo, omitir), botón "Proponer cambio" (= editar si soy
  anfitrión/creador/admin).
- Crear propuesta: formulario corto o texto libre vía IA (`eventos[]`).

## 7 · Nosotros (hoja de vida)

- Grid de tarjetas: foto (bucket `marea-perfiles/<id>/avatar.jpg`, firmada) o inicial, apodo,
  ciudad, "superpoder". Toque → ficha: cumpleaños, alergias/restricciones (**destacado**,
  lo usan los cocineros), bebida favorita, canción de karaoke, juego favorito, talla,
  bio. Insignias calculadas al vuelo: "El que más pagó" (max pagado en `vw_balances`),
  "Anfitrión" (más eventos como anfitrión), "Manos a la obra" (más tareas listas).
- **Mi perfil**: solo el propio es editable (RLS lo garantiza). Campos del `perfil` jsonb
  + foto (redimensionar a 512 px). Botón "Salir".
- El admin ve además teléfono y contacto de emergencia, y puede editarlos (vía Edge
  Function `actualizar`).

## 8 · Hoy (Home)

Arriba: "Día 3 de 7 · jueves 12" (o "Faltan N días" antes del viaje). Bloques:
**Lo de hoy** (eventos oficiales del día por bloque), **Mis turnos y tareas de hoy**,
**Mi saldo** (una línea: "Te deben $42,50" / "Debes $18,00" → va a Balances),
**Lo último** (3 gastos recientes). Botón flotante ＋.

## 9 · Admin (solo rol admin)

- **Invitados**: tabla (nombre, apodo, cédula, teléfono, rol, activo, último acceso).
  Crear (formulario) → modal con el PIN **grande** una sola vez, el texto de WhatsApp,
  botones **Copiar** y **Abrir WhatsApp** (si hay teléfono). Reset PIN (mismo modal).
  Bloquear/activar. Editar. Carga masiva: textarea "cedula,nombre,apodo,telefono" una por
  línea → crea en serie mostrando PIN por fila (y botón "Copiar todos los mensajes").
- **Viaje**: nombre, lugar, fechas desde/hasta, moneda → `config.viaje`.
- **Etiquetas**: lista, color, borrar.
- **Entradas pendientes**: lo que la gente mandó y no confirmó (`entradas` pendientes).
- **Turnos**: generador (§ 5).
- **Exportar**: CSV completo + respaldo JSON de todas las tablas.

Todas las llamadas a `marea-admin-personas` llevan `Authorization: Bearer <access_token de la
sesión>` y `apikey: <anon>`.

## 10 · Diseño

- Móvil primero (375 px), funciona en escritorio hasta 1100 px centrado.
- Tokens: `--arena:#F6EFE4 --mar:#1B7F8C --mar-2:#145F69 --coral:#FF6B57 --tinta:#17323B
  --tinta-2:#5B6B70 --linea:#E6DCCB --ok:#2E9E6B --warn:#D9961A --rojo:#C0392B
  --radio:14px --sombra:0 6px 20px rgba(23,50,59,.08)`. Fondo `--arena`, tarjetas blancas.
- Tipografías Google Fonts: **Fraunces** (títulos) + **Inter** (texto). Números con
  `font-variant-numeric: tabular-nums`.
- Botones ≥ 44 px de alto; chips 36 px; `safe-area-inset` abajo para la barra de pestañas.
- Formato de dinero: `new Intl.NumberFormat('es-EC',{style:'currency',currency:CFG.moneda})`.
- Vacíos con una frase amable e ilustración SVG simple, nunca una tabla vacía.
- Nada de rojo/navy corporativo. Esto es vacaciones.

## 11 · Pruebas (Playwright, `tests/`)

Crear dos usuarios de prueba por script (admin y un invitado) con la Edge Function.
Casos mínimos:
1. Login con cédula + PIN correcto entra; PIN malo muestra error.
2. Invitado **no** ve la pestaña Admin ni puede llamar `marea-admin-personas` (403).
3. Invitado crea un gasto manual; aparece en la lista; `vw_balances` cuadra (comparar con
   cálculo esperado a mano para 3 gastos fijos).
4. Invitado **no** puede editar un gasto ajeno (botón oculto y update rechazado por RLS).
5. Invitado edita su perfil; **no** puede editar el de otro.
6. `personas_publicas` no expone `cedula`, `telefono`, `emergencia`.
7. Foto de factura (usar `tests/fixtures/factura.jpg`, generar una con texto claro si no
   hay) → `marea-leer-gasto` devuelve `gastos[0].monto > 0`. Si no hay `ANTHROPIC_API_KEY`,
   la prueba se marca *skipped*, no fallida.
8. Voto: toggle suma y resta.

## 12 · Entrega por bloques (orden de la noche)

Cada bloque termina con: `BUILD_TAG` subido → commit → push → `scripts/deploy.sh` →
URL publicada muestra el tag → línea en `docs/ESTADO.md`.

| # | Bloque | Listo cuando |
|---|---|---|
| 1 | Repo, `wrangler.toml`, shell de `index.html` con login + pestañas vacías, SQL aplicado, admin semilla creado desde `.env` | Daniel entra con su cédula y ve el pie `v1` en marea.fieldbuil.ai o en workers.dev |
| 2 | Edge Functions desplegadas + pantalla Admin → Invitados completa + carga masiva | Crear invitado muestra PIN y mensaje copiable |
| 3 | Gastos manual completo + balances + quién paga a quién + fondo común + historial | 3 gastos de prueba cuadran con cálculo a mano |
| 4 | Entrada por texto y por foto (redimensión, subida, IA, formulario con confianzas) | Una factura real propone monto y descripción correctos |
| 5 | Tareas (kanban, subtareas, "yo me encargo", IA desde texto) + turnos | Lista en texto se vuelve 5 tareas confirmables |
| 6 | Eventos (calendario, propuestas con votos, hacer oficial, lista → tareas) | Se vota y una propuesta pasa a oficial con día |
| 7 | Nosotros (fichas, mi perfil, foto, insignias) | Invitado edita el suyo y no otro |
| 8 | Hoy + Realtime + PWA (manifest, sw, iconos generados) + exportar + pulido móvil | Instalable; Lighthouse PWA sin errores |
| 9 | Playwright § 11 pasando | `npx playwright test` verde |
| 10 | `docs/ESTADO.md` final, `README.md`, limpieza de datos de prueba | Daniel sabe qué hacer en la mañana |

## 13 · Lo que le toca a Daniel (la app lo deja claro en `docs/ESTADO.md`)

1. Amarrar `marea.fieldbuil.ai` al worker `marea` en Cloudflare (la zona `fieldbuil.ai`
   debe estar en la cuenta `f4c8…`; si el dominio se compró fuera, apuntar nameservers).
2. Cargar las cédulas y teléfonos reales de los 12 y las fechas del viaje.
3. Mandar los mensajes de WhatsApp desde Admin → Invitados.
