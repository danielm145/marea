# Estado · Marea Alta

> Lo primero que lee quien retome. Última actualización: **7-oct-2026, noche**.

## v1 · la app completa funciona en MODO DEMO

`public/index.html` (un solo archivo) trae todo construido y probado en navegador:

| Módulo | Qué hace |
|---|---|
| **Hoy** | Cuenta regresiva o "Día N de M", la temática de esta noche en grande (dress code + menú), lo próximo del itinerario, mi saldo, mis tareas, propuestas sin votar |
| **Gastos (Splitwise)** | Cada gasto dice **"prestaste $X"** o **"debes $X"**. Arriba "Tus cuentas": *En total te deben / debes* y con quién. Partes iguales, por % o por montos. Fondo común. "Quién debe a quién" con el mínimo de transferencias y botón **Ya se pagó**. Historial de cambios. Exportar CSV y resumen final |
| **Agregar (＋)** | Foto de factura, contar un gasto en texto ("pagué 30 de hielo, para todos menos Lucho"), gasto a mano, lista de tareas, tarea, propuesta de plan. Todo cae en un formulario que la persona confirma |
| **Tareas** | Por hacer / En curso / Listo, grupos, "Yo me encargo", checklist, generador de turnos (admin) |
| **Planes** | **Itinerario** por día (mañana/tarde/noche) con temática, dress code y **menú**; **Propuestas** con votos; anfitriones; lista de compras → tareas; alergias del grupo junto al menú |
| **Nosotros** | Ficha de cada invitado (alergias, canción de karaoke, juego, talla, superpoder), insignias, aviso de alergias para la cocina |
| **Admin** | Invitados (crear con clave de 4 dígitos + mensaje de WhatsApp listo, clave nueva, bloquear, carga masiva), datos del viaje (lugar, fechas, moneda), respaldo JSON |

Probado con Playwright a 390 px, como invitado y como admin: claves malas rechazadas, el
invitado no ve Admin ni puede editar gastos ajenos, **los saldos suman 0,00**, sin
desborde horizontal, tema día y noche.

**Modo demo** = los datos viven en el navegador de cada quien (no se comparten). Entrar como
Daniel: cédula `100000001`, clave `2026`; invitados `100000002`…`100000012`, misma clave.

Vista previa privada: https://claude.ai/artifact/AToFHmhjWFu3Fj255xnhoT

## Para publicarlo en marea.fieldbuil.ai (Mac de Daniel, 1 minuto)

```
cd ~/marea && git pull && scripts/deploy.sh
```
Queda en https://marea.daniel-martinez9094.workers.dev. Para el dominio (una vez):
```
scripts/deploy.sh wrangler.dominio.toml
```
Si ese segundo comando falla por permisos: dash.cloudflare.com → Workers & Pages → marea →
Settings → Domains & Routes → Add → Custom domain → `marea.fieldbuil.ai`.

## Para que todos compartan los mismos datos (conectar Supabase fieldbuilt-lab)

1. SQL editor de fieldbuilt-lab: pegar `sql/001_esquema.sql` y luego `sql/002_menu.sql`.
2. Project Settings → Data API → Exposed schemas → agregar `marea`.
3. En `public/index.html` pegar `SB_URL` y `SB_ANON` (Project Settings → API; son públicas).
4. Edge Functions (crear invitados y leer facturas con Claude): `scripts/funciones.sh`
   (necesita el `.env` lleno: service_role, access token, ANTHROPIC_API_KEY).
5. Subir `BUILD_TAG` y `scripts/deploy.sh`.

Mientras falte el paso 4, la app funciona pero no puede crear invitados desde Admin (se
pueden crear en Authentication → Users con email `<cedula>@marea.local` y contraseña
`<cedula>#<pin>`, más su fila en `marea.personas`) y la lectura de facturas cae al lector
rápido sin IA.

## Pendiente / ideas que Daniel puede pedir
- Realtime de Supabase (hoy refresca cada 45 s y al volver a la app).
- Varias personas pagando un mismo gasto (hoy: un pagador por gasto).
- Muro de fotos por día.
- Torneos con tabla de posiciones (karaoke, Risk, olimpiadas).

## Le toca a Daniel
- [ ] Correr `scripts/deploy.sh` en el Mac
- [ ] Amarrar marea.fieldbuil.ai
- [ ] Decidir cuándo conectar Supabase (pasos de arriba)
- [ ] Fechas reales del viaje, cédulas y teléfonos de los 12
