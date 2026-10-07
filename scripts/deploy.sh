#!/usr/bin/env bash
# Despliega el front a Cloudflare y VERIFICA contra lo publicado (no contra el repo).
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; [ -f .env ] && source .env; set +a
TAG=$(grep -o "BUILD_TAG='v[0-9]*'" public/index.html | head -1 | grep -o "v[0-9]*")
[ -n "$TAG" ] || { echo "No encuentro BUILD_TAG en public/index.html"; exit 1; }
npx wrangler@4 deploy --config wrangler.toml
for URL in https://marea.fieldbuil.ai https://marea.daniel-martinez9094.workers.dev; do
  PUB=$(curl -s "$URL/?x=$RANDOM" | grep -o "BUILD_TAG='v[0-9]*'" | head -1 | grep -o "v[0-9]*" || true)
  echo "$URL → publicado: ${PUB:-?}  (repo: $TAG)"
done
