#!/usr/bin/env node
// ============================================================================
// CASABLANCA · SAME · genera las imágenes vintage de la app (portada, noches, looks, comida)
// Corre en el Mac de Daniel:   node scripts/generar-imagenes.mjs           (solo las que faltan)
//                              node scripts/generar-imagenes.mjs --todo    (las rehace todas)
//                              node scripts/generar-imagenes.mjs karaoke   (solo esa)
// Motor (el primero que encuentre):
//   1. GEMINI_API_KEY (en el entorno, en .env o en ~/aero-wms/CREDENCIALES.local.md) → gemini-2.5-flash-image
//   2. VERTEX_PROJECT + `gcloud auth login` → Imagen 4 en Vertex AI
// Guarda en public/img/playa/<nombre>.jpg (con `sips` de macOS: 1400 px, calidad 72).
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SALIDA = path.join(RAIZ, "public/img/playa");
fs.mkdirSync(SALIDA, { recursive: true });

const ESTILO = "Vintage 1970s film photograph, Kodak Portra 400 grain, warm faded colors, soft golden sun flare, slightly washed highlights. " +
  "Setting: the Ecuadorian Pacific coast at Same, Esmeraldas — a white-and-blue Mediterranean style beach house, turquoise sea, wide sand beach, palm trees and pink bougainvillea. ";
const GENTE = "A diverse group of attractive, stylish friends in their late twenties, candid and joyful, natural poses, tasteful beachwear. ";
const FIN = " No text, no letters, no logos, no watermark. Editorial travel magazine quality.";
const COMIDA = "Overhead or 45-degree food photograph on a white-washed wooden table with blue linen, natural daylight, vintage film look. ";

const IMAGENES = {
  "portada": GENTE + "Wide shot of the friends walking barefoot along the shoreline at golden hour, laughing, the white-and-blue house behind them.",
  "llegada": GENTE + "Arriving at the beach house with vintage suitcases and straw hats, greeting each other on the white terrace with the blue umbrella.",
  "circulo": GENTE + "Welcome White Night: everyone dressed head to toe in white linen and crochet, sitting in a circle around a small bonfire on the beach under a starry sky, warm firelight on their faces.",
  "yoga": GENTE + "Sunrise yoga on the sand in front of calm turquoise water, soft pastel morning light.",
  "panzazos": GENTE + "Pool party: one friend mid-air doing a cannonball into a turquoise pool, the others cheering and holding score cards.",
  "sunset-grill": GENTE + "Golden Hour BBQ & cocktail night on the terrace: outfits in gold, beige, champagne sequins and chocolate brown, grilling picanha, chorizo and corn, mojitos and margaritas, string lights, orange sky over the ocean.",
  "playa-juegos": GENTE + "Playing spikeball and beach paddle ball on the sand, dynamic action, bright midday sun.",
  "karaoke": GENTE + "Night karaoke in the living room with a projector beam, two microphones, glitter and neon outfits, singing passionately.",
  "fotos-gafas": GENTE + "Fun sunglasses photoshoot at sunset on the beach, Tiki Boho outfits (vintage Hawaiian shirts, flower leis, straw hats, flowing boho skirts), everyone wearing bold colorful sunglasses, playful poses, close-up portraits. Unbranded sunglasses.",
  "pizza-juegos": GENTE + "Pizza & game night in elegant satin pajamas: making homemade pizzas together, then playing Jenga, charades and card games around the table, laughing, cozy warm lamps.",
  "tapas": GENTE + "Candlelit tapas & wine night on the terrace in Tiki Boho outfits (Hawaiian shirts, flowers in the hair, boho dresses): gambas al ajillo, patatas bravas, tortilla, cheese boards, Tempranillo and white wine.",
  "restaurante": GENTE + "Last night of the trip: elegant beach dinner at a seaside restaurant, candles on white tablecloths, wine glasses, ocean at dusk behind them.",
  "estilo-welcome-white": "Fashion mood board photograph: a stylish group in all-white beach outfits (linen shirts, crochet tops, white swimsuits, flowy skirts, straw hats, leather sandals) on a white terrace by the sea.",
  "estilo-golden-hour": "Fashion mood board photograph: a stylish group in gold, beige, champagne sequins, satin and chocolate brown outfits on the sand at golden hour, palm trees, sun flare.",
  "estilo-tiki-boho": "Fashion mood board photograph: a fun group in Tiki Boho outfits — vintage Hawaiian shirts, flower leis, straw bucket hats, orange boho dresses, shell accessories, colorful sunglasses — laughing on the beach with tiki mugs.",
  "cine": GENTE + "Outdoor movie night under the stars, projector screen hanging between palm trees, blankets and popcorn.",
  "throwback": GENTE + "Retro 2000s themed party, playful outfits, disco ball light, dancing in the living room.",
  "tesoro": GENTE + "Treasure hunt on the beach, friends running with a hand-drawn map and finding clues near palm trees.",
  "comida-ceviche": COMIDA + "Big bowl of Ecuadorian shrimp and fish ceviche with red onion, tomato, cilantro, lime, side of chifles (plantain chips) and popcorn.",
  "comida-cafe": COMIDA + "Pour-over coffee being brewed in a glass carafe, ceramic cups, fresh papaya and watermelon slices, morning sun.",
  "comida-desayuno-healthy": COMIDA + "Yogurt bowls with papaya, watermelon, berries and granola, oat-banana pancakes and avocado toast.",
  "comida-desayuno-tradicional": COMIDA + "Ecuadorian coastal breakfast: tigrillo (mashed green plantain with egg and cheese), bolones de verde, crispy chicharrón, fresh cheese.",
  "comida-almuerzo-costeno": COMIDA + "Esmeraldas style encocado de pescado (fish in coconut sauce) with white rice, patacones and fresh salad, rustic ceramic plates.",
  "comida-sunset-grill": COMIDA + "Shrimp tacos and grilled meat tacos with mango salsa, purple cabbage, guacamole and lime, on a grill-side table at sunset.",
  "comida-pizza-juegos": COMIDA + "Homemade rustic pizzas with fresh toppings and a charcuterie board, next to dice and board game pieces.",
  "comida-tapas": COMIDA + "Spanish tapas: pan con tomate, jamón serrano, tortilla española, olives, aged cheeses, red and white wine glasses, candlelight.",
  "comida-hamburguesas": COMIDA + "Homemade burgers with melted cheese and rustic rosemary potatoes on a picnic table.",
  "comida-bebidas": COMIDA + "Tropical non-alcoholic drinks: virgin margaritas with salt rim, fresh coconut water in a coconut, passion fruit juice, ice.",
};

// Nano Banana = gemini-2.5-flash-image (rápido). Nano Banana Pro: GEMINI_MODELO=gemini-3-pro-image-preview
const MODELO = process.env.GEMINI_MODELO || "gemini-2.5-flash-image";
function leerKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  for (const f of [path.join(RAIZ, ".env"), path.join(os.homedir(), "aero-wms/CREDENCIALES.local.md")]) {
    try { const t = fs.readFileSync(f, "utf8"); const m = t.match(/GEMINI[_A-Z]*\s*[=:]\s*`?([A-Za-z0-9_\-]{30,})/) || t.match(/(AIza[0-9A-Za-z_\-]{30,})/); if (m) return m[1]; } catch { /* sigue */ }
  }
  return null;
}
async function conGemini(key, prompt) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${key}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "4:3" } } }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || r.status);
  const part = (j.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData);
  if (!part) throw new Error("no devolvió imagen (" + (j.candidates?.[0]?.finishReason || "?") + ")");
  return Buffer.from(part.inlineData.data, "base64");
}
async function conVertex(proyecto, prompt) {
  const token = execSync("gcloud auth print-access-token", { encoding: "utf8" }).trim();
  const loc = process.env.VERTEX_LOCATION || "us-central1";
  const r = await fetch(`https://${loc}-aiplatform.googleapis.com/v1/projects/${proyecto}/locations/${loc}/publishers/google/models/imagen-4.0-generate-001:predict`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: "4:3", personGeneration: "allow_adult" } }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || r.status);
  const b = j.predictions?.[0]?.bytesBase64Encoded;
  if (!b) throw new Error("Vertex no devolvió imagen");
  return Buffer.from(b, "base64");
}

const args = process.argv.slice(2), todo = args.includes("--todo"), solo = args.filter((a) => !a.startsWith("--"));
const key = leerKey(), proyecto = process.env.VERTEX_PROJECT;
if (!key && !proyecto) { console.error("Falta GEMINI_API_KEY (o VERTEX_PROJECT con gcloud). Ej: GEMINI_API_KEY=AIza... node scripts/generar-imagenes.mjs"); process.exit(1); }
console.log("Motor:", key ? "Gemini (" + MODELO + ")" : "Vertex Imagen 4 · " + proyecto);
let hechas = 0;
for (const [nombre, escena] of Object.entries(IMAGENES)) {
  if (solo.length && !solo.includes(nombre)) continue;
  const jpg = path.join(SALIDA, nombre + ".jpg");
  if (fs.existsSync(jpg) && !todo && !solo.length) { console.log("  ya está ", nombre); continue; }
  const prompt = ESTILO + escena + FIN;
  try {
    process.stdout.write("  generando " + nombre + "… ");
    const buf = key ? await conGemini(key, prompt) : await conVertex(proyecto, prompt);
    const png = path.join(SALIDA, nombre + ".png");
    fs.writeFileSync(png, buf);
    try { execSync(`sips -s format jpeg -s formatOptions 72 -Z 1400 "${png}" --out "${jpg}"`, { stdio: "ignore" }); fs.unlinkSync(png); }
    catch { fs.renameSync(png, jpg); } // sin sips: se queda en PNG con nombre .jpg (los navegadores lo muestran igual)
    hechas++; console.log("listo");
  } catch (e) { console.log("falló: " + e.message); }
}
console.log(`\n${hechas} imagen(es) nuevas en public/img/playa. Sube la versión (BUILD_TAG) y despliega: scripts/deploy.sh`);
