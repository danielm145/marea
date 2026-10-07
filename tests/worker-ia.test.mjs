// Prueba del Worker de IA sin red: se simula la respuesta de Gemini/Vertex.
// node tests/worker-ia.test.mjs
import assert from "node:assert/strict";
import w from "../worker/index.js";

const ASSETS = { fetch: async () => new Response("asset") };
let ultima = null, respuesta = null;
globalThis.fetch = async (url, init) => { ultima = { url: String(url), init, body: JSON.parse(init.body) }; return respuesta(); };
const gem = (obj, status = 200) => () => new Response(JSON.stringify(status === 200 ? { candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] } : { error: { message: "cuota" } }), { status });
const pedir = (body, extra = {}) => w.fetch(new Request("https://casablanca.fieldbuil.ai/api/ia", { method: "POST", headers: { "content-type": "application/json", origin: "https://casablanca.fieldbuil.ai", "cf-connecting-ip": extra.ip || "1.1.1.1" }, body: JSON.stringify(body) }), extra.env || { GEMINI_API_KEY: "k", ASSETS });
const ctx = { autor_id: "p1", autor: "Daniel", hoy: "2026-10-28", personas: [{ id: "p1", nombre: "Daniel" }, { id: "p2", nombre: "Kevin López" }, { id: "p3", nombre: "Natalia" }], eventos: [{ id: "e1", titulo: "BBQ & Cocktail Night", dia: "2026-10-29" }] };
let ok = 0; const caso = async (n, f) => { await f(); ok++; console.log("✓", n); };

await caso("salud sin llave → ok:false", async () => {
  const r = await w.fetch(new Request("https://x/api/ia/salud"), { ASSETS }); assert.deepEqual(await r.json(), { ok: false, motor: null, modelo: null });
});
await caso("salud con Vertex manda sobre Gemini", async () => {
  const r = await w.fetch(new Request("https://x/api/ia/salud"), { ASSETS, VERTEX_API_KEY: "v", GEMINI_API_KEY: "g" }); assert.equal((await r.json()).motor, "vertex");
});
await caso("sin llave → 503 con mensaje claro", async () => {
  const r = await pedir({ texto: "hola" }, { env: { ASSETS } }); assert.equal(r.status, 503);
});
await caso("lo demás va a los assets", async () => {
  const r = await w.fetch(new Request("https://x/menu"), { ASSETS }); assert.equal(await r.text(), "asset");
});
await caso("gasto: limpia ids inventados, eventos falsos y RUC malo", async () => {
  respuesta = gem({ resumen: "Hielo para la BBQ", gastos: [{ descripcion: "Hielo y cervezas", monto: 48.004, categoria: "bebidas", alcance: "consumo", pagador_ids: ["p1"], participante_ids: ["p1", "p2", "zz"], modo: "igual", evento_id: "e1", factura: { tipo_documento: "ticket", ruc: "123", items: [{ descripcion: "Hielo", total: 8 }] }, etiquetas: ["Hielo"], confianza: 0.9, dudas: [] }], tareas: [], eventos: [], album: null });
  const r = await pedir({ texto: "pagué 48 de hielo para la bbq menos naty", imagen: "data:image/jpeg;base64,QUJD", modo: "auto", contexto: ctx });
  const j = await r.json(); assert.equal(r.status, 200, JSON.stringify(j));
  const g = j.propuesta.gastos[0];
  assert.deepEqual(g.participante_ids, ["p1", "p2"]); assert.equal(g.monto, 48); assert.equal(g.evento_id, "e1"); assert.equal(g.factura.ruc, null); assert.deepEqual(g.etiquetas, ["hielo"]);
  assert.equal(j.propuesta.ia, true);
  // lo que viajó a Google: llave en header (no en la URL), foto inline y esquema JSON
  assert.ok(!ultima.url.includes("key=")); assert.equal(ultima.init.headers["x-goog-api-key"], "k");
  assert.equal(ultima.body.contents[0].parts[0].inlineData.mimeType, "image/jpeg");
  assert.equal(ultima.body.generationConfig.responseMimeType, "application/json");
});
await caso("participantes vacíos = todos · pagador vacío = quien escribe", async () => {
  respuesta = gem({ resumen: "", gastos: [{ descripcion: "Despensa", monto: 120, categoria: "despensa", alcance: "fijo", pagador_ids: [], participante_ids: [], modo: "igual", confianza: .8, dudas: [], etiquetas: [] }], tareas: [], eventos: [] });
  const g = (await (await pedir({ texto: "despensa 120", contexto: ctx, ip: "2.2.2.2" })).json()).propuesta.gastos[0];
  assert.deepEqual(g.participante_ids, ["p1", "p2", "p3"]); assert.deepEqual(g.pagador_ids, ["p1"]);
});
await caso("foto del viaje → álbum con pie", async () => {
  respuesta = gem({ resumen: "Una foto del atardecer", gastos: [], tareas: [], eventos: [], album: { pie: "Atardecer en Same", evento_id: "nope" } });
  const j = await (await pedir({ imagen: "data:image/png;base64,QUJD", contexto: ctx, ip: "3.3.3.3" })).json();
  assert.deepEqual(j.propuesta.album, { pie: "Atardecer en Same", evento_id: null });
});
await caso("Vertex express usa aiplatform", async () => {
  respuesta = gem({ resumen: "", gastos: [], tareas: [{ titulo: "Comprar hielo", grupo: "Compras", prioridad: "alta", subtareas: [], responsable_id: "p9" }], eventos: [] });
  const j = await (await pedir({ texto: "comprar hielo", contexto: ctx, ip: "4.4.4.4" }, { env: { VERTEX_API_KEY: "v", ASSETS }, ip: "4.4.4.4" })).json();
  assert.ok(ultima.url.startsWith("https://aiplatform.googleapis.com/")); assert.equal(j.propuesta.tareas[0].responsable_id, null);
});
await caso("Google ocupado → 429 entendible", async () => {
  respuesta = gem(null, 429);
  const r = await pedir({ texto: "x", contexto: ctx, ip: "5.5.5.5" }); assert.equal(r.status, 429); assert.match((await r.json()).error, /ocupada/);
});
await caso("foto con formato raro → 400", async () => {
  const r = await pedir({ imagen: "data:text/html;base64,QUJD", contexto: ctx, ip: "6.6.6.6" }); assert.equal(r.status, 400);
});
await caso("otro sitio no puede usarla → 403", async () => {
  const r = await w.fetch(new Request("https://casablanca.fieldbuil.ai/api/ia", { method: "POST", headers: { origin: "https://malo.com" }, body: "{}" }), { GEMINI_API_KEY: "k", ASSETS }); assert.equal(r.status, 403);
});
await caso("freno: 41 lecturas seguidas de la misma IP → 429", async () => {
  respuesta = gem({ resumen: "", gastos: [], tareas: [], eventos: [] }); let ult;
  for (let i = 0; i < 41; i++) ult = await pedir({ texto: "x", contexto: ctx, ip: "9.9.9.9" });
  assert.equal(ult.status, 429);
});
await caso("esquema rechazado → reintenta sin esquema", async () => {
  let n = 0; respuesta = () => { n++; return n === 1 ? new Response(JSON.stringify({ error: { message: "Invalid JSON payload: response_schema" } }), { status: 400 }) : gem({ resumen: "ok", gastos: [], tareas: [], eventos: [] })(); };
  const r = await pedir({ texto: "x", contexto: ctx }, { ip: "7.7.7.7" }); assert.equal(r.status, 200); assert.equal(n, 2);
  assert.equal(ultima.body.generationConfig.responseSchema, undefined);
});
console.log(`\n${ok} casos OK`);
await caso("cuenta de servicio (GOOGLE_SA_B64): firma JWT, pide token y usa Vertex del proyecto", async () => {
  const { generateKeyPairSync } = await import("node:crypto");
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const sa = { project_id: "aero-ia", client_email: "ia@aero-ia.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) };
  const env = { GOOGLE_SA_B64: Buffer.from(JSON.stringify(sa)).toString("base64"), ASSETS };
  const vistas = [];
  respuesta = () => { if (ultimaUrl.includes("oauth2")) return new Response(JSON.stringify({ access_token: "tok-123", expires_in: 3600 })); return gem({ resumen: "ok", gastos: [], tareas: [], eventos: [] })(); };
  let ultimaUrl = "";
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, init) => { ultimaUrl = String(url); vistas.push({ url: ultimaUrl, auth: init.headers?.authorization, body: init.body }); return respuesta(); };
  const s = await (await w.fetch(new Request("https://x/api/ia/salud"), env)).json(); assert.equal(s.motor, "vertex");
  const r = await pedir({ texto: "x", contexto: ctx }, { env, ip: "8.8.8.8" }); assert.equal(r.status, 200);
  assert.ok(vistas[0].url.startsWith("https://oauth2.googleapis.com/token")); assert.match(String(vistas[0].body), /assertion=[\w-]+\.[\w-]+\.[\w-]+/);
  assert.equal(vistas[1].url, "https://us-central1-aiplatform.googleapis.com/v1/projects/aero-ia/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent");
  assert.equal(vistas[1].auth, "Bearer tok-123");
  await pedir({ texto: "y", contexto: ctx }, { env, ip: "8.8.8.8" }); assert.equal(vistas.filter((v) => v.url.includes("oauth2")).length, 1, "el token se reusa");
  globalThis.fetch = orig;
});
console.log(`${ok} casos OK (con cuenta de servicio)`);
