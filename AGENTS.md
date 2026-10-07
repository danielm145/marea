# AGENTS.md · Marea Alta (marea.fieldbuil.ai)

App del viaje a la playa de un grupo de 12 amigos: gastos compartidos tipo Splitwise,
tareas, eventos y noches temáticas, perfil de cada invitado. Dueño: Daniel Martínez
(admin). **Toda la comunicación, los commits, los comentarios y la interfaz van en
español.** Daniel no es programador: en los informes, pantallas y botones, no comandos.

## Fuente de verdad
`docs/SPEC.md` es la especificación completa. Si algo no está ahí, decide lo más simple
y anótalo en `docs/ESTADO.md`. No le preguntes a Daniel durante la noche: él lee
`docs/ESTADO.md` en la mañana.

## Stack (no cambiar)
- Front: **un solo archivo** `public/index.html` (HTML + CSS + JS vanilla) + Supabase JS por
  CDN. Sin framework ni bundler. Cloudflare Workers publica solo `public/`.
- Base: Supabase (Postgres + Auth + Storage + Edge Functions en Deno). Esquema en
  `sql/001_esquema.sql`; cambios posteriores en `sql/00N_*.sql`, **idempotentes**.
- IA: Edge Function `leer-gasto` con Claude (`claude-opus-5-5`, SDK oficial). Solo propone.
- Deploy: `scripts/deploy.sh` (front) y `scripts/funciones.sh` (Edge Functions).

## Reglas duras
1. **Nunca** guardes el PIN ni la contraseña en una tabla. La contraseña de Auth es
   `${cedula}#${pin}`; el front la compone al hacer login.
2. **Nunca** `select('*')` de `personas` desde el front. El front usa `personas_publicas`.
   Solo la pantalla Admin, vía la Edge Function, ve cédulas y teléfonos.
3. Buckets privados; las fotos se ven con URL firmada (`createSignedUrl`, 1 h).
4. Nada de lo que proponga la IA entra a la base sin que la persona confirme.
5. Los gastos no se borran: `eliminado=true` (el trigger guarda la versión anterior).
6. Cada entrega: sube `BUILD_TAG` en `public/index.html` (y `CACHE` en `sw.js` si lo
   tocas) → commit → push → `scripts/deploy.sh` → confirma que la URL publicada muestra
   el `BUILD_TAG` nuevo. **Verificar contra lo publicado, no contra el repo.**
7. Permisos se prueban con un usuario **invitado**, no solo con el admin (Playwright).
8. Nunca repintes el contenedor de un `<input>` desde su propio `oninput` (destruye el
   input mientras se escribe). Repinta solo la lista.
9. Dentro de template literals, escapa `</script>` como `<\/script>`.
10. Un bloque que se trabe más de 45 min se anota en `docs/ESTADO.md` y se sigue con el
    siguiente. Al amanecer importa haber intentado los 10 bloques, no 3 perfectos.

## Comandos
```
scripts/deploy.sh            # deploy front + verificación
scripts/funciones.sh         # link + secrets + deploy de Edge Functions
npx supabase db push         # o pegar el SQL en el editor del proyecto
node --check <(sed -n '/<script>/,/<\/script>/p' public/index.html | sed '1d;$d')   # sintaxis JS
npx playwright test          # pruebas (tests/)
# SQL local sin Supabase (Postgres 16): tests/sql/00_stubs_supabase_local.sql → sql/001_esquema.sql → tests/sql/10_balances_y_rls.sql
```
Credenciales en `.env` (gitignored). No las imprimas en logs ni en ESTADO.md.
