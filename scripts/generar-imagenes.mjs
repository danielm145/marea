#!/usr/bin/env node
// ============================================================================
// CASABLANCA · SAME · genera las imágenes de la app con VERTEX (la cuenta de Google de la empresa)
//
//   node scripts/generar-imagenes.mjs                 → solo las que faltan (eventos + comida + portada)
//   node scripts/generar-imagenes.mjs eventos         → solo las de los eventos
//   node scripts/generar-imagenes.mjs bbq-cocktail-night --todo   → esa, aunque ya exista
//   node scripts/generar-imagenes.mjs --todo          → las rehace todas
//
// Motor (el primero que encuentre, sin mostrar nunca la llave):
//   1. Cuenta de servicio de Vertex (la misma de AERO EC / el PLM):
//        GOOGLE_SA_B64 (base64 del JSON) · GOOGLE_APPLICATION_CREDENTIALS (ruta al JSON) ·
//        o un *.json "service_account" en ~/aero-ec, ~/aero-ec-hub, ~/aero-plm, ~/aero-wms, ~/Downloads
//        → Imagen 4 en Vertex (us-central1); si Imagen no está habilitado, gemini-2.5-flash-image en Vertex.
//   2. GEMINI_API_KEY (llave AIza…) → gemini-2.5-flash-image
// Guarda en public/img/eventos/<slug>.jpg y public/img/playa/<nombre>.jpg, y al final actualiza
// public/img/generadas.js (la lista que usa la app para no pedir fotos que no existen).
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PLAYA = path.join(RAIZ, "public/img/playa"), EVENTOS_DIR = path.join(RAIZ, "public/img/eventos");
for (const d of [PLAYA, EVENTOS_DIR]) fs.mkdirSync(d, { recursive: true });

const ESTILO = "Vintage 1970s film photograph, Kodak Portra 400 grain, warm faded colors, soft golden sun flare, slightly washed highlights. " +
  "Setting: Same, Esmeraldas, on the Ecuadorian Pacific coast — a white Mediterranean-style beach condominium among coconut palms, a turquoise pool, a wide golden-sand beach with gentle waves, a green hill in the background. ";
const GENTE = "A group of eight stylish friends in their late twenties and thirties, diverse Latin American faces, candid and joyful, natural poses, tasteful outfits. ";
const FIN = " No text, no letters, no logos, no watermark. Editorial travel magazine quality, realistic.";
const COMIDA = "Overhead or 45-degree food photograph on a white-washed wooden table with blue linen, natural daylight, vintage film look. ";

// Una imagen por evento, con su look y su lugar. El nombre = slug del título (lo mismo que calcula la app).
const EVENTOS = {
  "llegada-y-check-in": GENTE + "Arriving at the white beach condominium in the afternoon: rolling suitcases and straw hats, coolers full of drinks, hugging on the terrace with the pool and palms behind them, first excited look at the sea.",
  "circulo-de-intenciones-bajo-las-estrellas": GENTE + "Welcome White Night: everyone dressed head to toe in white linen and crochet, sitting in a circle on blankets around a small bonfire on the beach under a starry sky, candles in jars, warm firelight on their faces, quiet heartfelt moment.",
  "yoga-matutino": GENTE + "Sunrise yoga on the sand right in front of calm turquoise water, mats in a row, pastel pink and peach morning sky, soft mist, serene.",
  "torneo-de-panzazos-en-la-piscina": GENTE + "Pool party contest: one friend mid-air doing a big belly-flop cannonball into a turquoise pool, huge splash, three friends on the edge holding up handwritten score cards from 1 to 10, everyone laughing.",
  "pizza-game-night": GENTE + "Pizza & Game Night indoors in elegant satin pajamas: rolling homemade pizzas together at a big kitchen island, then playing Jenga and UNO cards around the table, laughing, warm cozy lamps, wine glasses.",
  "spike-ball-red-y-paletas-de-playa": GENTE + "Beach games in the afternoon: a dynamic spikeball match on the sand and two friends playing beach paddle ball, a volleyball net behind, coolers and towels, bright sun, action and laughter.",
  "bbq-cocktail-night": GENTE + "Golden Hour BBQ & cocktail night on the condo terrace facing the ocean: outfits in gold, beige, champagne satin and chocolate brown, a charcoal grill with picanha, chorizo and corn, mojitos and margaritas on a bar cart, string lights, orange sun setting into the sea.",
  "karaoke-y-talent-show": GENTE + "Night karaoke and talent show in the living room: a projector beam on the wall with lyrics, two microphones, one friend singing passionately with eyes closed, the others cheering on the sofa, golden outfits, disco ball light.",
  "sesion-de-fotos-freaky-monkey": GENTE + "Fun sunglasses photoshoot at sunset on the beach: Tiki Boho outfits (vintage Hawaiian shirts, flower leis, straw bucket hats, orange boho dresses), everyone wearing bold colorful unbranded sunglasses, playful poses, close-up portraits, palm trees.",
  "tapas-wine-night": GENTE + "Candlelit tapas & wine night on the terrace in Tiki Boho outfits (Hawaiian shirts, flowers in the hair, boho dresses): gambas al ajillo, patatas bravas, tortilla española, jamón and cheese boards, glasses of red and white wine, laughing during a wine tasting.",
  "restaurant-night": GENTE + "Last night of the trip: elegant beach dinner at a seaside restaurant, long table with white tablecloth and candles, raised glasses in a toast, dressed in beach-formal outfits, the ocean at dusk behind them.",
  "throwback-2000s": GENTE + "Retro 2000s themed party in the living room: low-rise jeans, butterfly clips, trucker hats and tinted glasses, a disco ball, dancing to old reggaeton, flip phones and a digital camera.",
  "cine-bajo-las-estrellas": GENTE + "Outdoor movie night under the stars on the terrace: a projector screen hanging between two palm trees, blankets, bean bags and bowls of popcorn, faces lit by the screen.",
  "busqueda-del-tesoro": GENTE + "Treasure hunt on the beach: friends running across the sand with a hand-drawn map, finding a clue tied to a palm tree, excited and competitive, late afternoon light.",
  "olimpiadas-de-playa": GENTE + "Beach olympics: sack race and relay race with buckets of water on the sand, two teams in matching colored t-shirts, a sandcastle in the foreground, laughing and cheering.",
};

const IMAGENES = {
  "portada": GENTE + "Wide shot of the friends walking barefoot along the shoreline at golden hour, laughing, the white beach condominium behind them.",
  "comida-ceviche": COMIDA + "Big bowl of Ecuadorian shrimp and fish ceviche with red onion, tomato, cilantro, lime, side of chifles (plantain chips) and popcorn.",
  "comida-cafe": COMIDA + "Pour-over coffee being brewed in a glass carafe, ceramic cups, fresh papaya and watermelon slices, coconut water and orange juice, morning sun.",
  "comida-desayuno-healthy": COMIDA + "Greek yogurt bowls with mango, banana, berries and granola, honey, avocado toast with egg.",
  "comida-desayuno-tradicional": COMIDA + "Ecuadorian coastal breakfast: tigrillo (mashed green plantain with egg and cheese), bolones de verde, fried egg, fresh cheese, avocado.",
  "comida-almuerzo-costeno": COMIDA + "Esmeraldas style encocado de pescado (fish in coconut sauce) with white rice, patacones and fresh salad, rustic ceramic plates.",
  "comida-sunset-grill": COMIDA + "Grilled picanha, chorizo, corn on the cob, sweet plantains and potatoes with chimichurri on a wooden board, at sunset.",
  "comida-pizza-juegos": COMIDA + "Homemade rustic pizzas (margherita, pepperoni, prosciutto with arugula) next to dice and board game pieces.",
  "comida-tapas": COMIDA + "Spanish tapas: pan con tomate, jamón serrano, tortilla española, gambas al ajillo, olives, aged cheeses, red and white wine glasses, candlelight.",
  "comida-bebidas": COMIDA + "Tropical drinks: margaritas with salt rim, mojitos, fresh coconut water in a coconut, passion fruit juice, ice.",
  // portada de Hoy (vertical): ilustración vintage como los stickers «Our Beach Era», no foto.
  "portada-hero": { aspecto: "3:4", prompt:
    "Sun-faded vintage 1970s travel poster illustration, hand-painted gouache with fine paper grain and soft halftone texture, " +
    "the same style as retro beach stickers: muted teal, cream, sand, coral and navy palette. " +
    "Scene: the wide golden-hour beach of Same, Esmeraldas, Ecuador — gentle turquoise Pacific waves with white foam, " +
    "two tall leaning coconut palms framing the left side, a green tropical hill on the right with white Mediterranean-style " +
    "apartment buildings stepping down it, a big soft coral sun low over the sea, a few pastel beach umbrellas far away. " +
    "Dreamy, warm, nostalgic, joyful. Portrait composition; keep the upper-middle sky calm and simple (a logo goes there). " +
    "No text, no letters, no logos, no watermark." },
};

// ---------- credenciales (nunca se imprimen) ----------
function buscarCuentaServicio() {
  if (process.env.GOOGLE_SA_B64) try { return JSON.parse(Buffer.from(process.env.GOOGLE_SA_B64, "base64").toString()); } catch { /* sigue */ }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) try { return JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8")); } catch { /* sigue */ }
  const H = os.homedir();
  for (const d of ["aero-ec", "aero-ec-hub", "aero-plm", "aero-wms", "Downloads", "Documents", ".config/gcloud"].map((x) => path.join(H, x))) {
    let archivos = []; try { archivos = fs.readdirSync(d).map((f) => path.join(d, f)); } catch { continue; }
    for (const f of archivos.filter((f) => f.endsWith(".json"))) {
      try { const j = JSON.parse(fs.readFileSync(f, "utf8")); if (j.type === "service_account" && j.private_key && j.project_id) return j; } catch { /* no es */ }
    }
    for (const f of archivos.filter((f) => /CREDENCIALES.*\.md$/.test(f))) {
      try { const m = fs.readFileSync(f, "utf8").match(/(?:GOOGLE|VERTEX)_SA_B64\s*[=:]\s*`?([A-Za-z0-9+/=]{200,})/); if (m) return JSON.parse(Buffer.from(m[1], "base64").toString()); } catch { /* sigue */ }
    }
  }
  return null;
}
function buscarGeminiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  for (const f of [path.join(RAIZ, ".env"), path.join(os.homedir(), "aero-wms/CREDENCIALES.local.md"), path.join(os.homedir(), "aero-ec/CREDENCIALES.local.md")]) {
    try { const m = fs.readFileSync(f, "utf8").match(/(AIza[0-9A-Za-z_-]{30,})/); if (m) return m[1]; } catch { /* sigue */ }
  }
  return null;
}
async function tokenDe(sa) {
  const b64u = (b) => Buffer.from(b).toString("base64url"), ahora = Math.floor(Date.now() / 1000);
  const cab = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const cue = b64u(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/cloud-platform", aud: "https://oauth2.googleapis.com/token", iat: ahora, exp: ahora + 3600 }));
  const firma = crypto.createSign("RSA-SHA256").update(cab + "." + cue).sign(sa.private_key).toString("base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" + cab + "." + cue + "." + firma });
  const j = await r.json();
  if (!j.access_token) throw new Error("Vertex no dio token: " + (j.error_description || j.error || r.status));
  return j.access_token;
}

// ---------- motores ----------
async function imagenVertex(sa, token, prompt, aspecto) {
  const loc = process.env.VERTEX_LOCATION || "us-central1", modelo = process.env.IMAGEN_MODELO || "imagen-4.0-generate-001";
  const r = await fetch(`https://${loc}-aiplatform.googleapis.com/v1/projects/${sa.project_id}/locations/${loc}/publishers/google/models/${modelo}:predict`, {
    method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: aspecto, personGeneration: "allow_adult", addWatermark: false } }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || r.status);
  const b = j.predictions?.[0]?.bytesBase64Encoded;
  if (!b) throw new Error("Imagen no devolvió imagen (filtro de seguridad)");
  return Buffer.from(b, "base64");
}
async function geminiImagen(url, headers, prompt, aspecto) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: aspecto } } }) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || r.status);
  const part = (j.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData);
  if (!part) throw new Error("no devolvió imagen (" + (j.candidates?.[0]?.finishReason || "?") + ")");
  return Buffer.from(part.inlineData.data, "base64");
}

const args = process.argv.slice(2), todo = args.includes("--todo"), solo = args.filter((a) => !a.startsWith("--"));
const sa = buscarCuentaServicio(), key = sa ? null : buscarGeminiKey();
if (!sa && !key) {
  console.error("No encontré la cuenta de servicio de Vertex ni una llave de Gemini.\n" +
    "Pon el JSON de la cuenta de servicio en ~/aero-ec/ (o exporta GOOGLE_APPLICATION_CREDENTIALS=/ruta/al.json) y vuelve a correr.");
  process.exit(1);
}
let token = sa ? await tokenDe(sa) : null, usarImagen = !!sa;
const GEM_MODELO = process.env.GEMINI_MODELO || "gemini-2.5-flash-image";
console.log("Motor:", sa ? `Vertex · proyecto ${sa.project_id} · Imagen 4 (respaldo ${GEM_MODELO})` : `Gemini API · ${GEM_MODELO}`);

async function generar(prompt, aspecto) {
  if (usarImagen) {
    try { return await imagenVertex(sa, token, prompt, aspecto); }
    catch (e) { if (/not found|permission|not enabled|PERMISSION_DENIED|404|403/i.test(e.message)) { console.log(`\n  (Imagen 4 no disponible: ${e.message.slice(0, 90)} → uso ${GEM_MODELO})`); usarImagen = false; } else throw e; }
  }
  if (sa) return geminiImagen(`https://aiplatform.googleapis.com/v1/projects/${sa.project_id}/locations/global/publishers/google/models/${GEM_MODELO}:generateContent`, { authorization: "Bearer " + token }, prompt, aspecto);
  return geminiImagen(`https://generativelanguage.googleapis.com/v1beta/models/${GEM_MODELO}:generateContent`, { "x-goog-api-key": key }, prompt, aspecto);
}

const trabajos = [
  ...Object.entries(EVENTOS).map(([n, e]) => ({ n, dir: EVENTOS_DIR, grupo: "eventos", prompt: ESTILO + e + FIN, aspecto: "4:3" })),
  ...Object.entries(IMAGENES).map(([n, e]) => ({ n, dir: PLAYA, grupo: "playa", prompt: typeof e === "string" ? ESTILO + e + FIN : e.prompt, aspecto: typeof e === "string" ? "4:3" : e.aspecto })),
];
let hechas = 0, fallas = 0;
for (const t of trabajos) {
  if (solo.length && !solo.includes(t.n) && !solo.includes(t.grupo)) continue;
  const jpg = path.join(t.dir, t.n + ".jpg");
  if (fs.existsSync(jpg) && !todo) { console.log("  ya está ", t.n); continue; }
  try {
    process.stdout.write("  generando " + t.n + "… ");
    const buf = await generar(t.prompt, t.aspecto);
    const tmp = jpg + ".png"; fs.writeFileSync(tmp, buf);
    try { execSync(`sips -s format jpeg -s formatOptions 76 -Z 1400 "${tmp}" --out "${jpg}"`, { stdio: "ignore" }); fs.unlinkSync(tmp); }
    catch { fs.renameSync(tmp, jpg); } // sin sips: queda en PNG con nombre .jpg (los navegadores lo muestran igual)
    hechas++; console.log("listo");
  } catch (e) { fallas++; console.log("falló: " + e.message.slice(0, 160)); }
}
execSync(`node "${path.join(RAIZ, "scripts/listar-fotos.mjs")}"`, { stdio: "inherit" });
console.log(`\n${hechas} imagen(es) nuevas${fallas ? `, ${fallas} fallaron (corre otra vez para reintentar)` : ""}.` +
  " Revísalas, sube BUILD_TAG y despliega: scripts/deploy.sh wrangler.dominio.toml");
