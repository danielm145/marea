#!/usr/bin/env bash
# ============================================================================
# CASABLANCA · llena el .env preguntando en el Terminal (sin editar archivos a mano).
#   scripts/llenar-env.sh
# Solo pregunta lo que falte; lo que ya está en .env se conserva. Las llaves secretas no se ven al pegarlas.
# Después: scripts/conectar.sh
# ============================================================================
set -uo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] || cp .env.example .env

# lee un valor actual del .env
val() { grep -E "^[[:space:]]*$1[[:space:]]*=" .env 2>/dev/null | tail -1 | cut -d= -f2- | sed -e 's/^[[:space:]]*//' -e 's/^["'"'"'`]//' -e 's/["'"'"'`]$//' -e 's/[[:space:]]*#.*$//' -e 's/[[:space:]]*$//'; }
# guarda un valor en el .env (reemplaza la línea o la agrega)
put() { local k=$1 v=$2 tmp; tmp=$(mktemp)
  if grep -qE "^[[:space:]]*$k[[:space:]]*=" .env; then awk -v k="$k" -v v="$v" '{l=$0; sub(/^[ \t]+/,"",l)} index(l,k"=")==1||index(l,k" =")==1{print k"="v; next} {print}' .env > "$tmp" && mv "$tmp" .env
  else printf '%s=%s\n' "$k" "$v" >> .env; rm -f "$tmp"; fi; }
# parte del medio de un JWT → texto
jwt() { local p; p=$(printf '%s' "$1" | cut -d. -f2 | tr '_-' '/+'); while [ $(( ${#p} % 4 )) -ne 0 ]; do p="$p="; done; printf '%s' "$p" | base64 -d 2>/dev/null; }

echo "Vamos a llenar los datos de Casablanca. Pega cada cosa y presiona Enter."
echo

# Proyecto y llave pública (fieldbuilt-lab): ya conocidos
[ -n "$(val SUPABASE_PROJECT_REF)" ] || put SUPABASE_PROJECT_REF mycgyvegfrdwbdcjuxse
[ -n "$(val SUPABASE_ANON_KEY)" ] || put SUPABASE_ANON_KEY 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15Y2d5dmVnZnJkd2JkY2p1eHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwODA0ODgsImV4cCI6MjEwMDY1NjQ4OH0.O5lJC3qBeONolSH8XRDTnEXg5uw3KezSzFRNlUUe770'
echo "✓ Proyecto fieldbuilt-lab y llave pública (ya los tenía)"

# 1 · service_role
okSR() { local v; v=$(val SUPABASE_SERVICE_ROLE_KEY); [[ "$v" == eyJ* ]] && jwt "$v" | grep -q '"service_role"'; }
okSR && put SUPABASE_SERVICE_ROLE_KEY "$(val SUPABASE_SERVICE_ROLE_KEY)"   # deja la línea limpia
okSR || put SUPABASE_SERVICE_ROLE_KEY ""
while ! okSR; do
  echo
  echo "1) La llave service_role (Supabase → Project Settings → API Keys → pestaña «Legacy» → service_role → Reveal → copiar)."
  printf "   Pégala aquí (no se ve al pegar) y Enter: "; read -rs v; echo
  if [[ "$v" == eyJ* ]] && jwt "$v" | grep -q '"service_role"'; then put SUPABASE_SERVICE_ROLE_KEY "$v"; echo "   ✓ guardada"
  else echo "   ✗ Esa no parece la service_role (debe empezar con eyJ y ser la de «service_role», no la anon). Prueba otra vez."; fi
done
echo "✓ service_role"

# 2 · token sbp_
okTK() { [[ "$(val SUPABASE_ACCESS_TOKEN)" == sbp_* ]]; }
okTK && put SUPABASE_ACCESS_TOKEN "$(val SUPABASE_ACCESS_TOKEN)"
okTK || put SUPABASE_ACCESS_TOKEN ""
while ! okTK; do
  echo
  echo "2) El token que creaste (empieza con sbp_)."
  printf "   Pégalo aquí (no se ve al pegar) y Enter: "; read -rs v; echo
  if [[ "$v" == sbp_* ]]; then put SUPABASE_ACCESS_TOKEN "$v"; echo "   ✓ guardado"; else echo "   ✗ Debe empezar con sbp_. Prueba otra vez."; fi
done
echo "✓ token"

# 3 · celular (mismas reglas que la app: Ecuador 09…, Colombia 3…, o con +593 / +57)
celOk() { local d; d=$(printf '%s' "$1" | tr -cd '0-9'); d=${d#00}
  if [ ${#d} -eq 10 ] && [[ $d == 0* ]]; then d=593${d:1}; elif [ ${#d} -eq 9 ] && [[ $d == 9* ]]; then d=593$d; elif [ ${#d} -eq 10 ] && [[ $d == 3* ]]; then d=57$d; fi
  [[ $d =~ ^[0-9]{11,15}$ ]]; }
if celOk "$(val ADMIN_CELULAR)"; then put ADMIN_CELULAR "$(val ADMIN_CELULAR)"
else [ -n "$(val ADMIN_CELULAR)" ] && echo && echo "   «$(val ADMIN_CELULAR)» no parece un celular (¿es la cédula?). La app entra con el CELULAR."; put ADMIN_CELULAR ""; fi
while [ -z "$(val ADMIN_CELULAR)" ]; do
  echo; printf "3) Tu celular (ej. 0985576470): "; read -r v
  if celOk "$v"; then put ADMIN_CELULAR "$v"; else echo "   ✗ Eso no parece un celular. Ej. 0985576470"; fi
done
echo "✓ celular"

# 4 · cumpleaños
[[ "$(val ADMIN_CUMPLE)" =~ ^[0-9]{1,2}[/.-][0-9]{1,2}$ ]] && put ADMIN_CUMPLE "$(val ADMIN_CUMPLE)" || put ADMIN_CUMPLE ""
while [ -z "$(val ADMIN_CUMPLE)" ]; do
  echo; printf "4) Tu cumpleaños, día/mes (ej. 07/03): "; read -r v
  if [[ "$v" =~ ^[0-9]{1,2}[/.-][0-9]{1,2}$ ]]; then put ADMIN_CUMPLE "$v"; else echo "   ✗ Escríbelo como día/mes, ej. 07/03."; fi
done
echo "✓ cumpleaños"
[ -n "$(val ADMIN_NOMBRE)" ] || put ADMIN_NOMBRE "Daniel Martínez"

for k in SUPABASE_PROJECT_REF SUPABASE_URL SUPABASE_ANON_KEY ADMIN_NOMBRE VERTEX_SA_JSON ANTHROPIC_API_KEY; do grep -qE "^[[:space:]]*$k[[:space:]]*=" .env && put "$k" "$(val "$k")"; done
echo
echo "Listo, el .env quedó completo. Ahora corre:  scripts/conectar.sh"
