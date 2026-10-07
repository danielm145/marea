# Prompt para Claude Code en el Mac de Daniel (v24 → publicar con Vertex, imágenes y caras)

Copia TODO el bloque de abajo y pégalo en Claude Code abierto en `~/marea`.

```
Trabaja en ~/marea (app del viaje "Casablanca", Same). Lee primero docs/ESTADO.md (secciones v23 y v24).
Habla conmigo en español, corto. Nunca muestres llaves, tokens ni el JSON de la cuenta de servicio.

0. git pull. El repo danielm145/marea es PÚBLICO y vamos a subir caras de personas reales:
   ponlo privado antes de commitear fotos (gh repo edit danielm145/marea --visibility private
   --accept-visibility-change-consequences). Si no se puede, dime y espera.

1. IA con VERTEX (la cuenta de servicio de la empresa, la misma que usa AERO EC como GOOGLE_SA_B64):
   corre scripts/ia.sh. Busca el JSON "service_account" en ~/aero-ec, ~/aero-ec-hub, ~/aero-plm,
   ~/aero-wms, ~/Downloads y ~/Documents (y en los CREDENCIALES*.md). Si no lo encuentra, búscalo tú en
   mi Mac (sin imprimirlo) y pásaselo: scripts/ia.sh /ruta/al.json. Debe terminar con
   "ok":true y "motor":"vertex". Si el proyecto no tiene habilitado Vertex AI, dime el error exacto.

2. Imágenes con VERTEX: node scripts/generar-imagenes.mjs
   (genera una imagen por evento en public/img/eventos/, la comida y la portada-hero en public/img/playa/,
   y actualiza public/img/generadas.js). Abre y MIRA cada imagen: si alguna tiene texto, manos raras,
   no se parece al evento o se ve falsa, rehazla: node scripts/generar-imagenes.mjs <nombre> --todo.

3. Caras: ya están 5 (daniel-martinez, ana-paula, alegria, domenika-perez, natalia-vasquez). FALTAN kevin-lopez,
   ana-cristina-grijalva y amelia-camacho: dejé sus capturas de Instagram en ~/marea/fotos-ig/ (si no están, pídemelas).
   Si encuentras una mejor resolución de las 5 que ya están, reemplázalas.
   De cada captura recorta SOLO la foto de perfil (el círculo), cuadrada, ~400x400, jpg calidad 85,
   y guárdala como public/img/gente/<nombre>.jpg con estos nombres:
     daniel-martinez (@danielmartinez.ecommerce) · ana-paula (@anaribadeneira) · alegria (@alegria_r.g.c)
     kevin-lopez (@kevin_l.c.h) · ana-cristina-grijalva (@grijalvaanacristina) · domenika-perez (@domenikaperez_23)
     natalia-vasquez (@natyvasqueza) · amelia-camacho (@amelia_c19)
   Si con Supabase conectado los nombres reales son otros, el archivo se llama como el nombre completo
   (sin tildes, con guiones) o como el primer nombre. Luego: node scripts/listar-fotos.mjs
   No subas las capturas completas al repo (fotos-ig/ queda fuera: agrégalo a .gitignore).

4. Sube la versión: BUILD_TAG en public/index.html (v26) y CACHE en public/sw.js (marea-v26).
   Prueba: node tests/worker-ia.test.mjs. Commit + push.

5. Publica en el subdominio casablanca: scripts/deploy.sh wrangler.dominio.toml
   Debe decir para https://casablanca.fieldbuil.ai → publicado: v26 · IA: vertex.
   Si el dominio no se amarra por permisos, amárralo en dash.cloudflare.com → Workers & Pages → marea →
   Settings → Domains & Routes → Add → Custom domain → casablanca.fieldbuil.ai, y vuelve a correr deploy.sh.

6. Prueba real en https://casablanca.fieldbuil.ai: entra como Daniel, "Cuéntale a la IA" → toma una foto de
   cualquier ticket y escribe "pagué yo, para todos menos Naty". Debe llenar el gasto solo. Dime cómo salió
   y mándame captura de Hoy, de un evento y de un gasto llenado por la IA.
```
