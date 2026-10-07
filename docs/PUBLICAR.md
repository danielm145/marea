# Publicar Casablanca (con IA de Vertex y usuarios de verdad)

Una sola vez, en el Terminal del Mac. Tarda unos 5 minutos.

## 1 · Llenar el `.env`
```
cd ~/marea && git pull
cp .env.example .env
open -e .env
```
Llena estos datos (al lado de cada uno dice dónde encontrarlo):

| Dato | Dónde |
|---|---|
| `SUPABASE_PROJECT_REF` | supabase.com → proyecto **fieldbuilt-lab** → Project Settings → General → Project ID |
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Project Settings → API Keys → `anon` / public |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → `service_role` (secreta) |
| `SUPABASE_ACCESS_TOKEN` | supabase.com → tu cuenta → Access Tokens → Generate (empieza con `sbp_`) |
| `ADMIN_CELULAR` · `ADMIN_CUMPLE` | tu celular y tu cumpleaños (día/mes) |

El `.env` nunca se sube a GitHub.

## 2 · Un comando
```
scripts/conectar.sh
```
Hace todo y se puede repetir sin dañar nada:
1. Base de datos: aplica `sql/001…013`, expone el esquema `marea` y te crea como admin.
2. Despliega la función que crea a los invitados.
3. Conecta la app con la base (como secretos de Cloudflare, no en el código).
4. Conecta la IA de **Vertex** (la cuenta de servicio de la empresa, la misma de AERO EC).
   Si no la encuentra sola, descarga el JSON (Google Cloud → IAM → Cuentas de servicio → la cuenta → Claves →
   Agregar clave → JSON), pon su ruta en `VERTEX_SA_JSON` del `.env` y repite el comando.
5. Publica en **https://casablanca.fieldbuil.ai** y comprueba que la IA responda.

## 3 · Dar acceso a los 8
1. Entra a https://casablanca.fieldbuil.ai con **tu celular** y la clave = **día y mes de tu cumpleaños** (DDMM).
2. **Más → Administrar → Invitados → + Agregar**: nombre, celular y cumpleaños de cada uno.
3. Toca **Abrir WhatsApp**: le llega el link y cómo entrar. Cada quien entra con su celular y su cumpleaños.

## Si algo falla
- `deploy.sh` muestra para cada URL la versión publicada y si la IA está conectada (`IA: vertex`).
- https://casablanca.fieldbuil.ai/api/ia/salud debe decir `"ok":true`.
- Si el dominio no se amarra: dash.cloudflare.com → Workers & Pages → marea → Settings → Domains & Routes →
  Add → Custom domain → `casablanca.fieldbuil.ai`, y repetir `scripts/deploy.sh wrangler.dominio.toml`.
