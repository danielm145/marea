#!/usr/bin/env bash
# Despliega a Cloudflare y VERIFICA contra lo publicado (no contra el repo), incluida la IA.
# No necesita .env: usa el login de wrangler del Mac (npx wrangler@4 login).
#   scripts/deploy.sh                         → solo workers.dev
#   scripts/deploy.sh wrangler.dominio.toml   → además casablanca.fieldbuil.ai y marea.fieldbuil.ai
set -euo pipefail
cd "$(dirname "$0")/.."
# un CLOUDFLARE_API_TOKEN vacío o viejo le gana al login: se ignora si está vacío
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then unset CLOUDFLARE_API_TOKEN; fi
TAG=$(grep -o "BUILD_TAG='v[0-9]*'" public/index.html | head -1 | grep -o "v[0-9]*")
CFG=${1:-wrangler.toml}
npx -y wrangler@4 deploy --config "$CFG"
sleep 3
for URL in https://marea.daniel-martinez9094.workers.dev https://casablanca.fieldbuil.ai https://marea.fieldbuil.ai; do
  PUB=$(curl -s "$URL/?x=$RANDOM" | grep -o "BUILD_TAG='v[0-9]*'" | head -1 | grep -o "v[0-9]*" || true)
  IA=$(curl -s "$URL/api/ia/salud" | grep -o '"motor":"[a-z]*"' | cut -d'"' -f4 || true)
  echo "$URL → publicado: ${PUB:-(aún no responde)}  ·  repo: $TAG  ·  IA: ${IA:-NO conectada (corre scripts/ia.sh)}"
done
