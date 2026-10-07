#!/usr/bin/env node
// ============================================================================
// CASABLANCA · deja lista la BASE para que los 8 usen la app de verdad (Supabase fieldbuilt-lab, esquema marea).
// Lo corre scripts/conectar.sh; también suelto:  node scripts/conectar.mjs
//
// Lee .env (gitignored) y, sin mostrar ninguna llave:
//   1. aplica sql/001 … sql/0NN en orden (todos son idempotentes) con la Management API de Supabase
//   2. expone el esquema `marea` a la API (Data API → Exposed schemas), sin quitar los que ya estaban
//   3. crea (o repara) al admin con su celular y su cumpleaños → entra con celular + clave DDMM
// No toca el esquema public ni nada de las otras apps del proyecto compartido. Nunca hace db reset ni db push.
// ============================================================================
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
// el .env manda (lo vacío no pisa); el entorno solo completa lo que falte
const env = { ...process.env };
for (const [k, v] of Object.entries(leerEnv(path.join(RAIZ, ".env")))) if (v !== "") env[k] = v;
/* las llaves se toman LIMPIAS aunque al pegarlas haya quedado algo al lado (un espacio, la cédula, un salto) */
const jwtDe = (v) => (String(v || "").match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/) || [""])[0];
for (const k of ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY"]) if (env[k]) env[k] = jwtDe(env[k]);
if (env.SUPABASE_ACCESS_TOKEN) env.SUPABASE_ACCESS_TOKEN = (String(env.SUPABASE_ACCESS_TOKEN).match(/sbp_[A-Za-z0-9_]+/) || [""])[0];
if (env.SUPABASE_PROJECT_REF) env.SUPABASE_PROJECT_REF = (String(env.SUPABASE_PROJECT_REF).match(/[a-z0-9]{20}/) || [env.SUPABASE_PROJECT_REF])[0];
if (env.SUPABASE_PROJECT_REF && !/^https:\/\/[a-z0-9]{10,}\.supabase\.co\/?$/.test(env.SUPABASE_URL || "")) env.SUPABASE_URL = `https://${env.SUPABASE_PROJECT_REF}.supabase.co`;   // la URL sale sola del Project ID

// scripts/conectar.sh pide aquí los valores ya limpios (así bash no interpreta el .env)
if (process.argv.includes("--env")) {
  const q = (v) => "'" + String(v ?? "").replace(/'/g, "'\\''") + "'";
  for (const k of ["SUPABASE_PROJECT_REF", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ACCESS_TOKEN", "VERTEX_SA_JSON", "ANTHROPIC_API_KEY"])
    console.log(`export ${k}=${q(env[k])}`);
  process.exit(0);
}
function leerEnv(f) {
  const o = {}; let t = ""; try { t = fs.readFileSync(f, "utf8"); } catch { return o; }
  for (const l of t.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(#.*)?$/); if (m) o[m[1]] = m[2].replace(/^["'`]|["'`]$/g, ""); }
  return o;
}
// --ci (GitHub Actions): solo base de datos y esquema expuesto; el admin ya existe y no hace falta la service_role
const CI = process.argv.includes("--ci");
const falta = (CI ? ["SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN"] : ["SUPABASE_PROJECT_REF", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ACCESS_TOKEN", "ADMIN_CELULAR"]).filter((k) => !env[k]);
if (falta.length) { console.error("Falta en .env: " + falta.join(", ") + "\n(ver .env.example: de dónde sale cada una)"); process.exit(1); }

const REF = env.SUPABASE_PROJECT_REF, URLSB = String(env.SUPABASE_URL || "").replace(/\/$/, ""), SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const API = (env.SUPABASE_API_BASE || "https://api.supabase.com") + "/v1/projects/" + REF, H = { authorization: "Bearer " + env.SUPABASE_ACCESS_TOKEN, "content-type": "application/json" };
const ok = (m) => console.log("  ✓ " + m), paso = (m) => console.log("\n" + m);

async function sql(query) {
  const r = await fetch(API + "/database/query", { method: "POST", headers: H, body: JSON.stringify({ query }) });
  const t = await r.text(); if (!r.ok) throw new Error(t.slice(0, 400));
  try { return JSON.parse(t); } catch { return t; }
}
const q = (v) => v == null ? "null" : "'" + String(v).replace(/'/g, "''") + "'";

// mismas reglas que la app y la Edge Function
function normTel(t) {
  let d = String(t ?? "").replace(/\D/g, ""); if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("0")) d = "593" + d.slice(1); else if (d.length === 9 && d.startsWith("9")) d = "593" + d; else if (d.length === 10 && d.startsWith("3")) d = "57" + d;
  return /^[0-9]{11,15}$/.test(d) ? d : null;
}
function normCumple(c) {
  const t = String(c ?? "").trim(); let dd, mm, m;
  if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) { mm = +m[2]; dd = +m[3]; }
  else if ((m = t.match(/^(\d{1,2})[\/\-. ](\d{1,2})/))) { dd = +m[1]; mm = +m[2]; }
  else if ((m = t.match(/^(\d{2})(\d{2})$/))) { dd = +m[1]; mm = +m[2]; } else return null;
  const max = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mm - 1]; if (!max || dd < 1 || dd > max) return null;
  return String(mm).padStart(2, "0") + "-" + String(dd).padStart(2, "0");
}

// 1 · SQL — cada archivo corre UNA sola vez (queda anotado en marea._migraciones).
// Así un archivo que siembra datos (ej. 014 viajeros) no vuelve a crear a alguien que el admin cambió después.
// Un cambio nuevo a la base = un archivo nuevo (016_…), nunca editar uno ya aplicado.
paso("1/3 · Base de datos (esquema marea)");
await sql(`create schema if not exists marea;
  create table if not exists marea._migraciones (archivo text primary key, aplicado_at timestamptz not null default now());
  revoke all on marea._migraciones from anon, authenticated;`);
const hechos = new Set((await sql("select archivo from marea._migraciones;")).map((x) => x.archivo));
const archivos = fs.readdirSync(path.join(RAIZ, "sql")).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort();
let nuevos = 0;
for (const f of archivos) {
  if (hechos.has(f)) continue;
  try { await sql(fs.readFileSync(path.join(RAIZ, "sql", f), "utf8")); await sql(`insert into marea._migraciones (archivo) values (${q(f)}) on conflict do nothing;`); ok(f); nuevos++; }
  catch (e) { console.error("  ✗ " + f + "\n    " + e.message); process.exit(1); }
}
if (!nuevos) ok(`nada nuevo (${archivos.length} archivos ya aplicados)`);

// 2 · exponer el esquema marea a la API
paso("2/3 · Exponer el esquema marea a la app");
{
  const r = await fetch(API + "/postgrest", { headers: H }); const cfg = await r.json().catch(() => ({}));
  if (!r.ok) { console.error("  ✗ no pude leer la config de la API: " + JSON.stringify(cfg).slice(0, 200)); process.exit(1); }
  const esquemas = String(cfg.db_schema || "public").split(",").map((s) => s.trim()).filter(Boolean);
  if (esquemas.includes("marea")) ok("ya estaba expuesto (" + esquemas.join(", ") + ")");
  else {
    const r2 = await fetch(API + "/postgrest", { method: "PATCH", headers: H, body: JSON.stringify({ db_schema: [...esquemas, "marea"].join(",") }) });
    if (!r2.ok) { console.error("  ✗ no pude exponer marea: " + (await r2.text()).slice(0, 200)); process.exit(1); }
    ok("expuesto: " + [...esquemas, "marea"].join(", "));
  }
  await sql("notify pgrst, 'reload schema';").catch(() => {});
}

// 3 · el admin
if (CI) { console.log("\nBase lista (modo automático)."); process.exit(0); }
paso("3/3 · Tu usuario de admin");
{
  const tel = normTel(env.ADMIN_CELULAR), cumple = normCumple(env.ADMIN_CUMPLE), nombre = env.ADMIN_NOMBRE || "Daniel Martínez";
  if (!tel) { console.error("  ✗ ADMIN_CELULAR no parece un celular (ej. 0985576470)"); process.exit(1); }
  if (env.ADMIN_CUMPLE && !cumple) { console.error("  ✗ ADMIN_CUMPLE no parece día/mes (ej. 1806)"); process.exit(1); }
  const pin = cumple ? cumple.slice(3, 5) + cumple.slice(0, 2) : "", email = tel + "@marea.local", password = tel + "#" + (pin || crypto.randomUUID());
  const AH = { apikey: SRK, authorization: "Bearer " + SRK, "content-type": "application/json" };
  let r = await fetch(URLSB + "/auth/v1/admin/users", { method: "POST", headers: AH, body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { nombre } }) });
  let j = await r.json().catch(() => ({})), uid = j.id;
  if (!r.ok) {   // ya existía: se busca y se le deja la clave = cumpleaños
    const f = await sql(`select id from auth.users where email = ${q(email)} limit 1;`); uid = Array.isArray(f) && f[0] && f[0].id;
    if (!uid) { console.error("  ✗ no pude crear la cuenta: " + JSON.stringify(j).slice(0, 200)); process.exit(1); }
    r = await fetch(URLSB + "/auth/v1/admin/users/" + uid, { method: "PUT", headers: AH, body: JSON.stringify({ password, email_confirm: true }) });
    if (!r.ok) { console.error("  ✗ no pude actualizar la cuenta: " + (await r.text()).slice(0, 200)); process.exit(1); }
  }
  await sql(`with u as (update marea.personas set auth_id = ${q(uid)}, rol = 'admin', activo = true where telefono = ${q(tel)} returning id)
    insert into marea.personas (auth_id, telefono, cumple, nombre, rol, activo)
    select ${q(uid)}, ${q(tel)}, ${q(cumple)}, ${q(nombre)}, 'admin', true where not exists (select 1 from u);`);
  ok(`${nombre}: entra solo con el celular ${env.ADMIN_CELULAR}`);
}
console.log("\nBase lista.");
