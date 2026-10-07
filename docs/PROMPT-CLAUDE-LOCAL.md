# Prompt para Claude Code en el Mac de Daniel — publicar con Vertex y usuarios de verdad

Copia el bloque y pégalo en Claude Code abierto en `~/marea`.

```
Trabaja en ~/marea (app del viaje "Casablanca", Same, 9–12 de octubre). Lee docs/PUBLICAR.md y docs/ESTADO.md (v30).
Habla conmigo en español y corto. Nunca muestres llaves, tokens ni el JSON de la cuenta de servicio.

1. git pull. Si no existe .env, cópialo de .env.example. Llena lo que puedas encontrar en mi Mac sin
   imprimirlo (CREDENCIALES*.md de ~/aero-wms, ~/aero-ec, etc.): el proyecto Supabase es fieldbuilt-lab.
   Lo que no encuentres (llaves de Supabase, token sbp_, mi celular y cumpleaños), pídemelo y dime
   exactamente dónde sacarlo.
2. Corre scripts/conectar.sh. Si un paso falla, arréglalo y repítelo (todo es idempotente).
   Para Vertex usa la cuenta de servicio de la empresa (la misma de AERO EC); si no está en disco, dime
   cómo descargar el JSON y pon su ruta en VERTEX_SA_JSON.
3. Verifica: https://casablanca.fieldbuil.ai responde v30 y /api/ia/salud dice "motor":"vertex".
4. Opcional: node scripts/generar-imagenes.mjs (una imagen por evento con Vertex), mírala, sube BUILD_TAG
   y CACHE, commit + push y scripts/deploy.sh wrangler.dominio.toml.
5. Dime cómo entro y que ya puedo agregar a los invitados en Más → Administrar → Invitados.
```
