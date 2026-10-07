#!/usr/bin/env bash
# ============================================================================
# CASABLANCA · UN SOLO COMANDO para que la app quede publicada, con la IA de Vertex
# y con usuarios de verdad (todos ven los mismos gastos, planes y fotos).
#
#   cd ~/marea && git pull && scripts/conectar.sh
#
# Antes, una sola vez: copiar .env.example a .env y llenarlo (ahí dice de dónde sale cada dato).
# Pasos (se pueden repetir sin dañar nada):
#   1. base de datos: SQL, esquema expuesto y tu usuario de admin   (scripts/conectar.mjs)
#   2. la función que crea a los invitados (Edge Function marea-admin-personas)
#   3. la conexión de la app con la base: SB_URL y SB_ANON como secretos del Worker
#   4. la IA de Vertex (cuenta de servicio de la empresa)               (scripts/ia.sh)
#   5. publicar en https://casablanca.fieldbuil.ai                       (scripts/deploy.sh)
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] || { echo "Falta .env: cp .env.example .env y llénalo."; exit 1; }
set -a; source .env; set +a
: "${SUPABASE_URL:=https://${SUPABASE_PROJECT_REF:-}.supabase.co}"   # la URL sale sola del Project ID
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then unset CLOUDFLARE_API_TOKEN; fi

echo "════ 1 · Base de datos ════"
node scripts/conectar.mjs

echo; echo "════ 2 · Función de invitados ════"
SECRETOS=(MAREA_APP_ORIGIN="https://casablanca.fieldbuil.ai")
[ -n "${ANTHROPIC_API_KEY:-}" ] && SECRETOS+=(ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY")
npx -y supabase@latest secrets set --project-ref "$SUPABASE_PROJECT_REF" "${SECRETOS[@]}" >/dev/null
npx -y supabase@latest functions deploy marea-admin-personas --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  npx -y supabase@latest functions deploy marea-leer-gasto marea-menu marea-info --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt
fi

echo; echo "════ 3 · Conexión de la app con la base ════"
printf '%s' "$SUPABASE_URL" | npx -y wrangler@4 secret put SB_URL --config wrangler.dominio.toml
printf '%s' "$SUPABASE_ANON_KEY" | npx -y wrangler@4 secret put SB_ANON --config wrangler.dominio.toml

echo; echo "════ 4 · IA de Vertex ════"
scripts/ia.sh ${VERTEX_SA_JSON:-}

echo; echo "════ 5 · Publicar ════"
scripts/deploy.sh wrangler.dominio.toml

echo
echo "LISTO. Entra a https://casablanca.fieldbuil.ai con tu celular y la clave = día y mes de tu cumpleaños."
echo "Luego: Más → Admin → Invitados → agrega a cada uno (nombre, celular y cumpleaños) y toca WhatsApp:"
echo "les llega el link y cómo entrar. Cada quien entra con SU celular y SU cumpleaños."
