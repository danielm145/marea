#!/usr/bin/env node
// ============================================================================
// BEACH TRIP · baja fotos reales y bonitas (gente en la playa, atardeceres, comida)
// desde Openverse: millones de fotos con licencia libre, sin llave ni cuenta.
//
//   node scripts/fotos-stock.mjs            → baja las que faltan
//   node scripts/fotos-stock.mjs --todo     → las vuelve a bajar todas
//   node scripts/fotos-stock.mjs yoga tapas → solo esas
//
// Solo toma fotos que se pueden usar libremente (licencias comerciales: CC0, PDM,
// CC BY, CC BY-SA), horizontales y grandes. Guarda en public/img/playa/<nombre>.jpg
// (los mismos nombres que usa la app) y anota autor y licencia en
// public/img/playa/creditos.json — la app los muestra en «Créditos de las fotos».
// Si una no te gusta: bórrala y corre otra vez con --siguiente <nombre> (toma la próxima).
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SALIDA = path.join(RAIZ, "public/img/playa");
const CRED = path.join(SALIDA, "creditos.json");
fs.mkdirSync(SALIDA, { recursive: true });

// nombre de archivo → búsqueda (en inglés: ahí están casi todas las fotos)
const FOTOS = {
  "portada": "friends walking beach sunset",
  "llegada": "friends beach house terrace",
  "circulo": "beach bonfire night friends",
  "yoga": "yoga beach sunrise",
  "panzazos": "pool party friends",
  "sunset-grill": "barbecue sunset beach friends",
  "playa-juegos": "beach volleyball friends",
  "karaoke": "karaoke party friends",
  "fotos-gafas": "friends sunglasses beach",
  "pizza-juegos": "friends pizza night",
  "tapas": "tapas wine table",
  "restaurante": "beach restaurant dinner candles",
  "cine": "outdoor cinema night",
  "throwback": "retro party dancing friends",
  "tesoro": "beach palm trees treasure",
  "comida-ceviche": "ceviche",
  "comida-cafe": "pour over coffee morning",
  "comida-bebidas": "tropical cocktails beach",
  "comida-hamburguesas": "burger fries",
  "comida-almuerzo-costeno": "fish coconut curry rice",
  "comida-desayuno-healthy": "yogurt bowl fruit granola",
  "comida-desayuno-tradicional": "fried egg plantain breakfast",
  "comida-pizza-juegos": "homemade pizza",
  "comida-sunset-grill": "grilled meat skewers",
  "comida-tapas": "spanish tapas",
};

const args = process.argv.slice(2);
const todo = args.includes("--todo");
const siguiente = args.includes("--siguiente");
const solo = args.filter((a) => !a.startsWith("--"));
const creditos = fs.existsSync(CRED) ? JSON.parse(fs.readFileSync(CRED, "utf8")) : {};

async function buscar(q) {
  const u = new URL("https://api.openverse.org/v1/images/");
  u.searchParams.set("q", q);
  u.searchParams.set("license_type", "commercial");
  u.searchParams.set("aspect_ratio", "wide");
  u.searchParams.set("size", "large");
  u.searchParams.set("page_size", "20");
  const r = await fetch(u, { headers: { "User-Agent": "BeachTrip/1.0 (viaje privado de amigos)" } });
  if (!r.ok) throw new Error("Openverse respondió " + r.status);
  const j = await r.json();
  return (j.results || []).filter((x) => x.url && (x.width || 0) >= 1000 && !/\.gif$/i.test(x.url));
}

async function bajar(nombre, q) {
  const jpg = path.join(SALIDA, nombre + ".jpg");
  const ya = fs.existsSync(jpg);
  if (ya && !todo && !(siguiente && solo.includes(nombre))) return false;
  const vistos = new Set(creditos[nombre]?.descartadas || []);
  if (siguiente && creditos[nombre]?.url) vistos.add(creditos[nombre].url);
  const res = (await buscar(q)).filter((x) => !vistos.has(x.url));
  for (const x of res) {
    try {
      const r = await fetch(x.url, { headers: { "User-Agent": "BeachTrip/1.0" } });
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 40_000) continue;                       // miniatura o error disfrazado
      const tmp = jpg + ".tmp";
      fs.writeFileSync(tmp, buf);
      try { execSync(`sips -s format jpeg -s formatOptions 74 -Z 1400 "${tmp}" --out "${jpg}"`, { stdio: "ignore" }); fs.unlinkSync(tmp); }
      catch { fs.renameSync(tmp, jpg); }                       // sin sips (Linux): se queda tal cual
      creditos[nombre] = {
        url: x.url, pagina: x.foreign_landing_url, titulo: x.title || "", autor: x.creator || "desconocido",
        licencia: `${(x.license || "").toUpperCase()} ${x.license_version || ""}`.trim(), fuente: x.source || x.provider || "",
        descartadas: [...vistos],
      };
      console.log(`✓ ${nombre} — «${x.title || "sin título"}» de ${x.creator || "?"} (${creditos[nombre].licencia})`);
      return true;
    } catch { /* prueba la siguiente */ }
  }
  console.log(`✗ ${nombre}: no encontré una buena para "${q}". Cambia la búsqueda en FOTOS.`);
  return false;
}

let hechas = 0;
for (const [nombre, q] of Object.entries(FOTOS)) {
  if (solo.length && !solo.includes(nombre)) continue;
  try { if (await bajar(nombre, q)) hechas++; } catch (e) { console.log(`✗ ${nombre}: ${e.message}`); }
  fs.writeFileSync(CRED, JSON.stringify(creditos, null, 2));
}
console.log(`\n${hechas} foto(s) nuevas en public/img/playa. Revísalas, sube BUILD_TAG y despliega: scripts/deploy.sh`);
