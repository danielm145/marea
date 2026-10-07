#!/usr/bin/env bash
# Conecta la IA de la app con VERTEX, la cuenta de Google de la empresa (la misma de AERO EC y el PLM).
# Sube la cuenta de servicio como SECRETO del Worker (GOOGLE_SA_B64), sin mostrarla nunca.
# La busca en este orden:
#   1. GOOGLE_SA_B64 en el entorno (base64 del JSON)
#   2. GOOGLE_APPLICATION_CREDENTIALS (ruta al JSON)
#   3. un *.json "service_account" en ~/aero-ec, ~/aero-ec-hub, ~/aero-plm, ~/aero-wms, ~/Downloads, ~/Documents
#   4. GOOGLE_SA_B64 / VERTEX_SA_B64 escrito en un CREDENCIALES*.md de esas carpetas
# Uso: scripts/ia.sh                 (Vertex con la cuenta de servicio — lo normal)
#      scripts/ia.sh /ruta/al.json   (esa cuenta de servicio)
#      scripts/ia.sh gemini          (respaldo: llave AIza… de Gemini API)
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then unset CLOUDFLARE_API_TOKEN; fi
CFG=wrangler.dominio.toml

if [ "${1:-}" = "gemini" ]; then
  KEY="${GEMINI_API_KEY:-}"
  for F in .env "$HOME/aero-wms/CREDENCIALES.local.md" "$HOME/aero-ec/CREDENCIALES.local.md"; do
    [ -n "$KEY" ] && break; [ -f "$F" ] && KEY=$(grep -Eo 'AIza[0-9A-Za-z_-]{30,}' "$F" | head -1 || true)
  done
  if [ -n "$KEY" ]; then printf '%s' "$KEY" | npx -y wrangler@4 secret put GEMINI_API_KEY --config "$CFG"
  else npx -y wrangler@4 secret put GEMINI_API_KEY --config "$CFG"; fi
else
  SA_B64=$(node --input-type=module -e '
    import fs from "node:fs"; import path from "node:path"; import os from "node:os";
    const ok = (j) => j && j.type === "service_account" && j.private_key && j.project_id;
    const salir = (j, de) => { process.stderr.write(`Cuenta de servicio: ${j.client_email} (proyecto ${j.project_id}) · de ${de}\n`); process.stdout.write(Buffer.from(JSON.stringify(j)).toString("base64")); process.exit(0); };
    const arg = process.argv[1];
    try { if (arg && arg !== "-") { const j = JSON.parse(fs.readFileSync(arg, "utf8")); if (ok(j)) salir(j, arg); } } catch {}
    try { const j = JSON.parse(Buffer.from(process.env.GOOGLE_SA_B64 || "", "base64").toString()); if (ok(j)) salir(j, "GOOGLE_SA_B64"); } catch {}
    try { const f = process.env.GOOGLE_APPLICATION_CREDENTIALS; const j = JSON.parse(fs.readFileSync(f, "utf8")); if (ok(j)) salir(j, f); } catch {}
    const H = os.homedir();
    for (const d of ["aero-ec", "aero-ec-hub", "aero-plm", "aero-wms", "Downloads", "Documents"].map((x) => path.join(H, x))) {
      let fs_ = []; try { fs_ = fs.readdirSync(d); } catch { continue; }
      for (const f of fs_.filter((f) => f.endsWith(".json"))) { try { const j = JSON.parse(fs.readFileSync(path.join(d, f), "utf8")); if (ok(j)) salir(j, path.join(d, f)); } catch {} }
      for (const f of fs_.filter((f) => /CREDENCIALES.*\.md$/.test(f))) { try { const m = fs.readFileSync(path.join(d, f), "utf8").match(/(?:GOOGLE|VERTEX)_SA_B64\s*[=:]\s*`?([A-Za-z0-9+/=]{200,})/); if (m) { const j = JSON.parse(Buffer.from(m[1], "base64").toString()); if (ok(j)) salir(j, path.join(d, f)); } } catch {} }
    }
    process.exit(1);' "${1:--}") || {
    echo "No encontré la cuenta de servicio de Vertex."
    echo "Copia el JSON de la cuenta de servicio (el mismo que usa AERO EC) a ~/aero-ec/ y vuelve a correr,"
    echo "o pásalo directo:  scripts/ia.sh /ruta/a/la-cuenta.json"
    exit 1; }
  printf '%s' "$SA_B64" | npx -y wrangler@4 secret put GOOGLE_SA_B64 --config "$CFG"
fi
sleep 3
for URL in https://casablanca.fieldbuil.ai https://marea.daniel-martinez9094.workers.dev; do
  echo "$URL/api/ia/salud → $(curl -s "$URL/api/ia/salud")"
done
echo 'Listo si dice "ok":true y "motor":"vertex". Pruébalo en la app: Cuéntale a la IA.'
