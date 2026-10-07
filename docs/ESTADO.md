# Estado · Marea Alta

> Lo primero que lee quien retome. Última actualización: **7-oct-2026, noche · v3**.

## Qué hay (todo probado en navegador a 390 px, como invitado y como admin)

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
1. SQL editor: `sql/001_esquema.sql`, `sql/002_menu.sql`, `sql/003_comida_presupuesto_album.sql` (en ese orden; se pueden repetir).
2. Project Settings → Data API → Exposed schemas → agregar `marea`.
3. En `public/index.html` pegar `SB_URL` y `SB_ANON`, subir `BUILD_TAG`, `scripts/deploy.sh`.
4. `scripts/funciones.sh` (necesita el `.env`): despliega `marea-admin-personas`, `marea-leer-gasto` (facturas con Claude), `marea-menu` (fichas de platos) y `marea-info` (lo esencial).

Validado en Postgres 16 local: los 3 SQL corren dos veces sin error, 16 tablas en `marea`, 0 en `public`, balances correctos, un invitado no toca la asistencia de otro, no crea comidas ni edita el presupuesto (`tests/sql/`).

## Pendiente
- **Airbnb**: este entorno no puede abrir airbnb.cl ni a0.muscache.com (política de red). Las fotos de la casa se suben desde Admin → Lo esencial; la descripción se pega y la IA saca las comodidades.
- Lista de invitados nueva: dos Kevin (Kevin y Kevin López), **Luciana** (no Luciano), **Grijalba**. Natalia Villar sigue aunque no venía en la última lista. Vanesa y John se agregan desde Admin si van.
- Imágenes generadas por IA para los platos: no incluidas (Claude no genera imágenes); por ahora foto real o ícono.
- Realtime (hoy refresca cada 45 s), varios pagadores por gasto.

## Le toca a Daniel
- [ ] `scripts/deploy.sh` y amarrar marea.fieldbuil.ai
- [ ] Fechas reales del viaje (Admin → El viaje)
- [ ] Conectar Supabase (pasos de arriba)
- [ ] Cédulas y WhatsApp de los invitados, y enviar las invitaciones
- [ ] Fotos y descripción de la casa en Lo esencial
