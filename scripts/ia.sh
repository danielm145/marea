#!/usr/bin/env bash
# Conecta la IA de la app: sube la llave de Google como SECRETO del Worker (una sola vez).
# Busca la llave sin mostrarla, en este orden:
#   1. VERTEX_API_KEY o GEMINI_API_KEY en el entorno
#   2. ~/marea/.env, ~/aero-wms/CREDENCIALES.local.md, ~/aero-ec/CREDENCIALES.local.md
# Si no la encuentra, wrangler te la pide y la pegas en la terminal (nunca en un chat).
# Uso: scripts/ia.sh            (Gemini API, llave AIza…)
#      scripts/ia.sh vertex     (Vertex AI modo express)
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then unset CLOUDFLARE_API_TOKEN; fi
NOMBRE=GEMINI_API_KEY; [ "${1:-}" = "vertex" ] && NOMBRE=VERTEX_API_KEY
KEY="${!NOMBRE:-}"
if [ -z "$KEY" ]; then
  for F in .env "$HOME/aero-wms/CREDENCIALES.local.md" "$HOME/aero-ec/CREDENCIALES.local.md"; do
    [ -f "$F" ] || continue
    if [ "$NOMBRE" = VERTEX_API_KEY ]; then
      KEY=$(grep -Eo 'VERTEX[_A-Z]*[[:space:]]*[=:][[:space:]]*`?[A-Za-z0-9_.-]{30,}' "$F" | head -1 | sed -E 's/.*[=:][[:space:]]*`?//' || true)
    else
      KEY=$(grep -Eo 'AIza[0-9A-Za-z_-]{30,}' "$F" | head -1 || true)
    fi
    [ -n "$KEY" ] && { echo "Llave encontrada en $F (no se muestra)."; break; }
  done
fi
if [ -n "$KEY" ]; then
  printf '%s' "$KEY" | npx -y wrangler@4 secret put "$NOMBRE" --config wrangler.toml
else
  echo "No encontré la llave. Pégala cuando wrangler la pida (no se ve al escribir):"
  npx -y wrangler@4 secret put "$NOMBRE" --config wrangler.toml
fi
sleep 2
curl -s https://marea.daniel-martinez9094.workers.dev/api/ia/salud; echo
echo "Listo. Si dice \"ok\":true la IA ya responde en la app."
