#!/usr/bin/env bash
# Despliega el front a Cloudflare y VERIFICA contra lo publicado (no contra el repo).
# No necesita .env: usa el login de wrangler del Mac (npx wrangler@4 login).
set -euo pipefail
cd "$(dirname "$0")/.."
# un CLOUDFLARE_API_TOKEN vacío o viejo le gana al login: se ignora si está vacío
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then unset CLOUDFLARE_API_TOKEN; fi
TAG=$(grep -o "BUILD_TAG='v[0-9]*'" public/index.html | head -1 | grep -o "v[0-9]*")
CFG=${1:-wrangler.toml}
npx -y wrangler@4 deploy --config "$CFG"
sleep 3
for URL in https://marea.daniel-martinez9094.workers.dev https://marea.fieldbuil.ai; do
  PUB=$(curl -s "$URL/?x=$RANDOM" | grep -o "BUILD_TAG='v[0-9]*'" | head -1 | grep -o "v[0-9]*" || true)
  echo "$URL → publicado: ${PUB:-(aún no responde)}  ·  repo: $TAG"
done
