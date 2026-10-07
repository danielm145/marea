#!/usr/bin/env bash
# Sube secretos y despliega las Edge Functions al proyecto Supabase de Marea Alta.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
npx supabase link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
npx supabase secrets set ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" APP_ORIGIN="https://marea.fieldbuil.ai"
npx supabase functions deploy admin-personas leer-gasto --no-verify-jwt
echo "OK. Probar: curl -s -X POST $SUPABASE_URL/functions/v1/admin-personas -H 'Authorization: Bearer <jwt admin>' -d '{\"action\":\"listar\"}'"
