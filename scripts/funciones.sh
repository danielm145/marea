#!/usr/bin/env bash
# Despliega las Edge Functions (lo hace también scripts/conectar.sh). La que importa es marea-admin-personas
# (crea a los invitados). Las que leen con Claude solo se despliegan si hay ANTHROPIC_API_KEY.
set -euo pipefail
cd "$(dirname "$0")/.."
eval "$(node scripts/conectar.mjs --env)"   # el .env lo lee Node, limpio
npx -y supabase@latest secrets set --project-ref "$SUPABASE_PROJECT_REF" MAREA_APP_ORIGIN="https://casablanca.fieldbuil.ai" ${ANTHROPIC_API_KEY:+ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"}
npx -y supabase@latest functions deploy marea-admin-personas --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt
[ -n "${ANTHROPIC_API_KEY:-}" ] && npx -y supabase@latest functions deploy marea-leer-gasto marea-menu marea-info --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt
echo "OK."
