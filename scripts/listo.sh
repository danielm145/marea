#!/usr/bin/env bash
# ============================================================================
# CASABLANCA · UN SOLO COMANDO para dejar todo bien (IA + base + página):
#
#   cd ~/marea && git pull && scripts/listo.sh
#
#   1. La IA: busca sola una llave en este Mac (cuenta de servicio de Vertex, o la llave
#      de Gemini que ya usan los otros proyectos en CREDENCIALES.local.md). Si no hay
#      ninguna, abre la página de Google para crearla y te pide pegarla UNA vez.
#   2. La base de datos: aplica lo nuevo (los viajeros, el arreglo del ingreso).
#   3. Publica la página.
#   4. Prueba la IA DE VERDAD y te dice si quedó funcionando.
# Se puede correr las veces que quieras: no daña nada.
# ============================================================================
set -uo pipefail
cd "$(dirname "$0")/.."
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then unset CLOUDFLARE_API_TOKEN; fi
CFG=wrangler.dominio.toml
URL=https://casablanca.fieldbuil.ai
linea() { echo; echo "════ $1 ════"; }

linea "1/4 · La IA"
IA_LISTA=0
PRUEBA=$(curl -s -m 40 "$URL/api/ia/salud?probar=1")
if printf '%s' "$PRUEBA" | grep -q '"prueba":"ok"' && [ "${1:-}" != "ia" ]; then
  echo "✓ La IA ya está conectada y responde (no hace falta otra llave)"; IA_LISTA=1
elif scripts/ia.sh "${VERTEX_SA_JSON:-}" >/dev/null 2>&1; then
  echo "✓ Conectada con Vertex (la cuenta de servicio de la empresa)"; IA_LISTA=1
else
  KEY="${GEMINI_API_KEY:-}"
  # la misma llave de Gemini que ya usan los otros proyectos (CREDENCIALES, .env, .dev.vars, scripts de imágenes)
  for F in "$HOME/aero-wms/CREDENCIALES.local.md" "$HOME/aero-ec/CREDENCIALES.local.md" "$HOME/aero-ec-hub/CREDENCIALES.local.md" \
           "$HOME/aero-plm/CREDENCIALES.local.md" "$HOME/aero-wms/.env" "$HOME/aero-ec/.env" "$HOME/aero-ec-hub/.dev.vars" \
           "$HOME/aero-ec/.dev.vars" "$HOME/aero-plm/.env" "$HOME/Documents/AERO_GHOST/.env" "$HOME"/Documents/AERO_GHOST/*.py \
           "$HOME"/aero-*/scripts/*.py "$HOME"/aero-*/scripts/*.mjs .env; do
    [ -n "$KEY" ] && break
    [ -f "$F" ] && KEY=$(grep -Eo 'AIza[0-9A-Za-z_-]{30,}|AQ\.[0-9A-Za-z_.-]{20,}' "$F" 2>/dev/null | head -1 || true)
  done
  [ -n "$KEY" ] && echo "  (la encontré en $F)"
  if [ -n "$KEY" ]; then
    echo "✓ Usaré la llave de Gemini que ya usan los otros proyectos"
  else
    echo "No encontré ninguna llave de IA en este Mac. Vamos a crear una (1 minuto):"
    echo "  1. Se abre la página de Google: toca «Create API key» y luego «Copy»."
    echo "  2. Vuelve aquí, pégala y presiona Enter (no se ve al pegar, es normal)."
    open "https://aistudio.google.com/apikey" 2>/dev/null || true
    while [ -z "$KEY" ]; do
      printf "\nPega la llave aquí (empieza con AIza o AQ.) y Enter: "; read -rs V; echo
      KEY=$(printf '%s' "$V" | grep -Eo 'AIza[0-9A-Za-z_-]{30,}|AQ\.[0-9A-Za-z_.-]{20,}' | head -1 || true)
      [ -n "$KEY" ] || echo "  ✗ Esa no parece la llave (empieza con AIza o AQ.). Prueba otra vez."
    done
  fi
  if printf '%s' "$KEY" | npx -y wrangler@4 secret put GEMINI_API_KEY --config "$CFG" >/dev/null 2>&1; then
    echo "✓ Llave de la IA guardada en la página"; IA_LISTA=1
  else
    echo "✗ No pude guardar la llave en Cloudflare. Corre:  npx wrangler@4 login   y vuelve a correr este comando."
  fi
fi

linea "2/4 · La base de datos y las funciones"
if [ -f .env ]; then
  node scripts/conectar.mjs 2>&1 | grep -E "✓|✗|Falta|Base lista" || true
  eval "$(node scripts/conectar.mjs --env 2>/dev/null)" || true
  if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ] && [ -n "${SUPABASE_PROJECT_REF:-}" ]; then
    npx -y supabase@latest secrets set --project-ref "$SUPABASE_PROJECT_REF" MAREA_APP_ORIGIN="$URL" >/dev/null 2>&1 || true
    if npx -y supabase@latest functions deploy marea-admin-personas marea-avisar --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt >/dev/null 2>&1; then echo "✓ Funciones al día (entrar con el celular, avisos)"
    else echo "✗ No pude subir las funciones (entrar y avisos). Vuelve a correr este comando."; fi
  fi
else echo "(sin .env: me salto este paso)"; fi

linea "3/4 · Publicar la página"
scripts/deploy.sh "$CFG" 2>&1 | grep -E "publicado|✘|ERROR|error" || true

# la ilustración de la salida: se dibuja una vez con la IA y queda guardada (así nadie espera al abrir la app)
for ARTE in salida lexus amarok; do
  A=$(curl -s -m 90 -o /dev/null -w "%{http_code} %{content_type}" "$URL/api/arte/$ARTE")
  case "$A" in 200\ image/*) echo "✓ Ilustración «$ARTE» lista (dibujada con IA)";; *) echo "  (la ilustración «$ARTE» no se pudo dibujar todavía: $A · sale igual con colores)";; esac
done

linea "4/4 · Prueba real de la IA"
sleep 3
R=$(curl -s -m 40 "$URL/api/ia/salud?probar=1")
if printf '%s' "$R" | grep -q '"prueba":"ok"'; then
  MOTOR=$(printf '%s' "$R" | grep -o '"motor":"[a-z]*"' | cut -d'"' -f4)
  echo "✓ LA IA FUNCIONA ($MOTOR). Abre la app, recarga y toca «Foto de la factura»."
else
  echo "✗ La IA todavía no responde. Esto dijo la página:"
  echo "  $R"
  echo "Copia ese mensaje y mándaselo a Claude."
fi
