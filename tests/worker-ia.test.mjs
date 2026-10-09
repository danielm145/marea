// Prueba del Worker de IA sin red: se simula la respuesta de Gemini/Vertex.
// node tests/worker-ia.test.mjs
import assert from "node:assert/strict";
import w from "../worker/index.js";

const ASSETS = { fetch: async () => new Response("asset") };
let ultima = null, respuesta = null;
// desde la v42 una foto pasa primero por el LECTOR de comprobantes (otro prompt): el simulador contesta según cuál prompt llega
let recibo = { es_comprobante: false };
const esLector = (init) => /lector de comprobantes/.test(JSON.parse(init.body).systemInstruction.parts[0].text);
const respRecibo = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(recibo) }] } }] }), { status: 200 });
const fetchBase = async (url, init) => { if (esLector(init)) return respRecibo(); ultima = { url: String(url), init, body: JSON.parse(init.body) }; return respuesta(); };
globalThis.fetch = fetchBase;
const gem = (obj, status = 200) => () => new Response(JSON.stringify(status === 200 ? { candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] } : { error: { message: "cuota" } }), { status });
const pedir = (body, extra = {}) => w.fetch(new Request("https://casablanca.fieldbuil.ai/api/ia", { method: "POST", headers: { "content-type": "application/json", origin: "https://casablanca.fieldbuil.ai", "cf-connecting-ip": extra.ip || "1.1.1.1" }, body: JSON.stringify(body) }), extra.env || { GEMINI_API_KEY: "k", ASSETS });
const ctx = { autor_id: "p1", autor: "Daniel", hoy: "2026-10-28", personas: [{ id: "p1", nombre: "Daniel" }, { id: "p2", nombre: "Kevin López" }, { id: "p3", nombre: "Natalia" }], eventos: [{ id: "e1", titulo: "BBQ & Cocktail Night", dia: "2026-10-29" }] };
let ok = 0; const caso = async (n, f) => { await f(); ok++; console.log("✓", n); };

await caso("salud sin llave → ok:false", async () => {
  const r = await w.fetch(new Request("https://x/api/ia/salud"), { ASSETS }); const j = await r.json(); assert.deepEqual({ ok: j.ok, motor: j.motor, modelo: j.modelo }, { ok: false, motor: null, modelo: null }); assert.equal(j.llaves.GOOGLE_SA_B64, false);
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
  respuesta = gem({ resumen: "Hielo para la BBQ", gastos: [{ descripcion: "Hielo y cervezas", monto: 48.004, categoria: "bebidas", alcance: "consumo", pagador_ids: ["p1"], participante_ids: ["p1", "p2", "zz"], modo: "igual", evento_id: "e1", factura: { tipo_documento: "ticket", ruc: "123", items: [{ descripcion: "Hielo", total: 8, para_ids: ["p1", "zz"] }] }, etiquetas: ["Hielo"], confianza: 0.9, dudas: [] }], tareas: [], eventos: [], album: null });
  recibo = { es_comprobante: true, tipo_documento: "ticket", comercio: "Tía", items: [{ descripcion: "Hielo", cantidad: 1, total: 8 }, { descripcion: "Cervezas", cantidad: 2, total: 40 }], subtotal: 48, total: 48, confianza: 0.9 };
  const r = await pedir({ texto: "pagué 48 de hielo para la bbq menos naty", imagen: "data:image/jpeg;base64,QUJD", modo: "auto", contexto: ctx });
  recibo = { es_comprobante: false };
  const j = await r.json(); assert.equal(r.status, 200, JSON.stringify(j));
  const g = j.propuesta.gastos[0];
  assert.deepEqual(g.participante_ids, ["p1", "p2"]); assert.equal(g.monto, 48); assert.equal(g.evento_id, "e1"); assert.equal(g.factura.ruc, null); assert.deepEqual(g.etiquetas, ["hielo"]); assert.deepEqual(g.factura.items[0].para_ids, ["p1"]);
  assert.equal(j.propuesta.ia, true);
  assert.equal(g.factura.items.length, 2, "el recibo manda: los 2 productos leídos"); assert.equal(g.factura.comercio, "Tía"); assert.equal(g.factura.items[1].para_ids.length, 0);
  assert.ok(!g.dudas.some((d) => /qui[eé]n pidi/i.test(d)), "ya se sabe de quién es el hielo: no pregunta");
  // lo que viajó a Google: llave en header (no en la URL), foto inline y esquema JSON
  assert.ok(!ultima.url.includes("key=")); assert.equal(ultima.init.headers["x-goog-api-key"], "k");
  // desde la v42 la foto va al LECTOR (paso A); al intérprete le llega el comprobante ya leído, como texto
  assert.ok(ultima.body.contents[0].parts.every((p) => !p.inlineData), "el intérprete no recibe la foto si el recibo se leyó");
  assert.ok(ultima.body.contents[0].parts[0].text.includes("COMPROBANTE YA LEÍDO") && ultima.body.contents[0].parts[0].text.includes("Cervezas"));
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
await caso("freno: 101 lecturas seguidas de la misma IP → 429 (100 alcanzan para todo el grupo en el mismo WiFi)", async () => {
  respuesta = gem({ resumen: "", gastos: [], tareas: [], eventos: [] }); let ult;
  for (let i = 0; i < 101; i++) ult = await pedir({ texto: "x", contexto: ctx, ip: "9.9.9.9" });
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
  assert.equal(vistas[1].url, "https://us-central1-aiplatform.googleapis.com/v1/projects/aero-ia/locations/us-central1/publishers/google/models/gemini-3.8-flash:generateContent");
  assert.equal(vistas[1].auth, "Bearer tok-123");
  await pedir({ texto: "y", contexto: ctx }, { env, ip: "8.8.8.8" }); assert.equal(vistas.filter((v) => v.url.includes("oauth2")).length, 1, "el token se reusa");
  globalThis.fetch = orig;
});
console.log(`${ok} casos OK (con cuenta de servicio)`);
await caso("plan: crear y cambiar un plan completo", async () => {
  respuesta = gem({ resumen: "Noche de tacos", gastos: [], tareas: [], eventos: [{ titulo: "Taco Night", tematica: "Tacos", descripcion: "Tacos en la terraza.", bloque: "atardecer", hora: "19:30:00", lugar: "terraza", dress_code: "Welcome White Night", dia: "nope", lista: ["Tortillas", { txt: "Limones" }, ""], menu: ["Tacos al pastor"] }] });
  const j = await (await pedir({ texto: "noche de tacos", modo: "plan", contexto: { ...ctx, looks: ["Welcome White Night"], plan_actual: { titulo: "Viejo", lista: [{ txt: "Hielo", ok: true }] } } }, { ip: "10.0.0.1" })).json();
  const e = j.propuesta.eventos[0];
  assert.equal(e.bloque, "atardecer"); assert.equal(e.hora, "19:30"); assert.equal(e.dia, null); assert.deepEqual(e.lista, ["Tortillas", "Limones"]); assert.deepEqual(e.menu, ["Tacos al pastor"]);
  const enviado = JSON.parse(ultima.body.contents[0].parts.at(-1).text.split("\n")[1]);
  assert.equal(enviado.modo, "plan"); assert.deepEqual(enviado.plan_actual.lista, ["Hielo"]); assert.deepEqual(enviado.looks, ["Welcome White Night"]);
  assert.match(ultima.body.contents[0].parts.at(-1).text, /CAMBIAR el plan_actual/);
});
console.log(`${ok} casos OK (con planes)`);
await caso("portada: «ponla de portada del círculo» → evento real, nada de gasto", async () => {
  respuesta = gem({ resumen: "Portada", gastos: [], tareas: [], eventos: [], portada: { evento_id: "e1" } });
  let j = await (await pedir({ texto: "ponla de portada de la BBQ", imagen: "data:image/jpeg;base64,QUJD", contexto: ctx }, { ip: "10.0.0.2" })).json();
  assert.deepEqual(j.propuesta.portada, { evento_id: "e1" }); assert.equal(j.propuesta.gastos.length, 0);
  respuesta = gem({ resumen: "", gastos: [], tareas: [], eventos: [], portada: { evento_id: "inventado" } });
  j = await (await pedir({ texto: "portada", imagen: "data:image/jpeg;base64,QUJD", contexto: ctx }, { ip: "10.0.0.3" })).json();
  assert.deepEqual(j.propuesta.portada, { evento_id: "" });
});
console.log(`${ok} casos OK (con portada)`);
await caso("viaje: «el viaje es del 28 de octubre al 1 de noviembre» → fechas válidas", async () => {
  respuesta = gem({ resumen: "Fechas", gastos: [], tareas: [], eventos: [], viaje: { desde: "2026-10-09", hasta: "2026-10-12", lugar: null, nombre: "" } });
  const j = await (await pedir({ texto: "el viaje es del 9 al 12 de octubre", contexto: ctx }, { ip: "10.0.0.4" })).json();
  assert.deepEqual(j.propuesta.viaje, { desde: "2026-10-09", hasta: "2026-10-12", lugar: null, nombre: null });
});
console.log(`${ok} casos OK (con viaje)`);
await caso("/api/config.js: sin variables = demo; con variables entrega URL y llave pública", async () => {
  let t = await (await w.fetch(new Request("https://x/api/config.js"), { ASSETS })).text(); assert.equal(t.trim(), "window.MAREA_SB=null;");
  t = await (await w.fetch(new Request("https://x/api/config.js"), { ASSETS, SB_URL: "https://abc.supabase.co", SB_ANON: "anon" })).text();
  assert.match(t, /"url":"https:\/\/abc.supabase.co","anon":"anon"/);
});
await caso("con Supabase conectado, la IA pide sesión", async () => {
  const env = { GEMINI_API_KEY: "k", ASSETS, SB_URL: "https://abc.supabase.co", SB_ANON: "anon" };
  const orig = globalThis.fetch; const urls = [];
  globalThis.fetch = async (url, init) => { url = String(url); urls.push(url); if (url.includes("/auth/v1/user")) return new Response("{}", { status: init.headers.authorization === "Bearer bueno" ? 200 : 401 }); return gem({ resumen: "", gastos: [], tareas: [], eventos: [] })(); };
  const mk = (tok) => w.fetch(new Request("https://casablanca.fieldbuil.ai/api/ia", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "11.0.0.1", ...(tok ? { authorization: "Bearer " + tok } : {}) }, body: JSON.stringify({ texto: "x", contexto: ctx }) }), env);
  assert.equal((await mk(null)).status, 401); assert.equal((await mk("malo")).status, 401); assert.equal((await mk("bueno")).status, 200);
  assert.equal((await mk("bueno")).status, 200); assert.equal(urls.filter((u) => u.includes("/auth/v1/user")).length, 2, "el token bueno se recuerda");
  globalThis.fetch = orig;
});
console.log(`${ok} casos OK (con sesión)`);

await caso("llave sin saldo (402) → prueba la otra llave aunque se llame distinto, y el modelo retirado → el siguiente", async () => {
  const orig = globalThis.fetch; const vistas = [];
  const BUENA = "AIza" + "b".repeat(35), MALA = "AIza" + "a".repeat(35);
  globalThis.fetch = async (url, init) => { url = String(url); const k = init.headers["x-goog-api-key"]; vistas.push({ url, k });
    if (k === MALA) return new Response(JSON.stringify({ error: { message: "Your prepayment credits are depleted" } }), { status: 402 });
    if (url.includes("gemini-3.8-flash")) return new Response(JSON.stringify({ error: { message: "This model models/gemini-3.8-flash is no longer available" } }), { status: 404 });
    return gem({ resumen: "ok", gastos: [], tareas: [], eventos: [] })(); };
  const env = { GEMINI_API_KEY: MALA, final: BUENA, ASSETS };
  const r = await w.fetch(new Request("https://casablanca.fieldbuil.ai/api/ia", { method: "POST", headers: { "content-type": "application/json", origin: "https://casablanca.fieldbuil.ai", "cf-connecting-ip": "9.9.9.9" }, body: JSON.stringify({ texto: "hola", contexto: ctx }) }), env);
  const j = await r.json(); assert.equal(r.status, 200, JSON.stringify(j)); assert.equal(j.propuesta.resumen, "ok");
  assert.ok(vistas.some((v) => v.k === BUENA && v.url.includes("gemini-2.5-flash")), "debió llegar a la llave buena con el 2.º modelo: " + JSON.stringify(vistas.map((v) => v.url.split("/models/")[1] + " " + v.k.slice(-1))));
  const s = await (await w.fetch(new Request("https://x/api/ia/salud?probar=1", { headers: { "cf-connecting-ip": "9.9.9.8" } }), env)).json();
  assert.equal(s.prueba, "ok"); assert.equal(s.llave, "…" + BUENA.slice(-4)); assert.equal(s.llaves.llaves_gemini, 2);
  globalThis.fetch = orig;
});
console.log(`${ok} casos OK (con llaves de respaldo)`);

await caso("items_actuales viaja al modelo con la pista de «de quién es cada producto»", async () => {
  let visto = null; globalThis.fetch = async (url, init) => { visto = JSON.parse(init.body); return gem({ resumen: "", gastos: [], tareas: [], eventos: [] })(); };
  const rr = await pedir({ texto: "el bloqueador es de Kevin", contexto: { ...ctx, items_actuales: [{ descripcion: "Bloqueador", total: 15 }, { descripcion: "Hielo", total: 6 }] } }, { ip: "7.7.7.7" }); assert.equal(rr.status, 200, await rr.text());
  const t = visto.contents[0].parts.map((p) => p.text || "").join("");
  assert.ok(t.includes('"items_actuales"') && t.includes("Bloqueador") && t.includes("DE QUIÉN es cada producto"), t.slice(0, 300));
});
console.log(`${ok} casos OK (con items_actuales)`);

await caso("/api/version lee la versión publicada del sw.js", async () => {
  const A = { fetch: async (req) => new Response(String(req.url).endsWith("/sw.js") ? "const CACHE = 'marea-v39';" : "asset") };
  const j = await (await w.fetch(new Request("https://x/api/version"), { ASSETS: A })).json(); assert.equal(j.v, "v39");
});
console.log(`${ok} casos OK (con versión)`);

await caso("v42 · el intérprete falla pero el recibo se leyó → igual sale el gasto armado con la factura", async () => {
  globalThis.fetch = fetchBase;
  recibo = { es_comprobante: true, tipo_documento: "factura", comercio: "El Muelle", items: [{ descripcion: "Ceviche", cantidad: 1, total: 15 }, { descripcion: "Pizza", cantidad: 1, total: 20 }], subtotal: 35, impuestos: 5.25, servicio: 3.5, total: 43.75, confianza: 0.8 };
  const antes = respuesta; respuesta = () => new Response(JSON.stringify({ error: { message: "boom" } }), { status: 500 });
  const j = await (await pedir({ imagen: "data:image/jpeg;base64,QUJD", modo: "gasto", contexto: ctx }, { ip: "12.0.0.1" })).json();
  respuesta = antes; recibo = { es_comprobante: false };
  const g = j.propuesta.gastos[0]; assert.ok(g, JSON.stringify(j)); assert.equal(g.monto, 43.75); assert.equal(g.categoria, "restaurantes"); assert.equal(g.descripcion, "Cuenta en El Muelle");
  assert.equal(g.factura.items.length, 2); assert.equal(g.factura.propina, 3.5); assert.deepEqual(g.pagador_ids, ["p1"]); assert.equal(g.participante_ids.length, 3);
});
await caso("v42 · modo items: solo el desglose", async () => {
  globalThis.fetch = fetchBase;
  recibo = { es_comprobante: true, tipo_documento: "ticket", items: [{ descripcion: "Bloqueador", total: 15 }], total: 15, confianza: 0.9 };
  const j = await (await pedir({ imagen: "data:image/jpeg;base64,QUJD", modo: "items", contexto: ctx }, { ip: "12.0.0.2" })).json();
  recibo = { es_comprobante: false };
  assert.equal(j.propuesta.gastos[0].factura.items[0].descripcion, "Bloqueador"); assert.equal(j.diag.recibo.items, 1);
});
await caso("v42 · la foto no es comprobante → el intérprete la ve y arma el álbum", async () => {
  globalThis.fetch = fetchBase;
  recibo = { es_comprobante: false, tipo_documento: "otro", items: [], confianza: 0.9 };
  let vioFoto = false; const antes = respuesta; respuesta = () => { vioFoto = !!(ultima.body.contents[0].parts.find((p) => p.inlineData)); return gem({ resumen: "Qué foto", gastos: [], tareas: [], eventos: [], album: { pie: "Atardecer en Same", evento_id: null } })(); };
  const j = await (await pedir({ imagen: "data:image/jpeg;base64,QUJD", contexto: ctx }, { ip: "12.0.0.3" })).json();
  respuesta = antes; assert.equal(j.propuesta.album.pie, "Atardecer en Same"); assert.ok(vioFoto, "el intérprete debe recibir la foto cuando no es comprobante");
});
console.log(`${ok} casos OK (v42 lector de comprobantes)`);

await caso("v44 · una factura = un gasto (si el intérprete la parte en dos, queda uno) y no va al álbum", async () => {
  globalThis.fetch = fetchBase;
  recibo = { es_comprobante: true, tipo_documento: "ticket", comercio: "Tía", items: [{ descripcion: "Hielo", total: 6 }, { descripcion: "Cervezas", total: 10 }], total: 16, confianza: 0.9 };
  const antes = respuesta; respuesta = gem({ resumen: "x", gastos: [{ descripcion: "Hielo", monto: 6, categoria: "bebidas", alcance: "fijo", pagador_ids: ["p1"], participante_ids: [], modo: "igual", etiquetas: [], confianza: .9, dudas: [] }, { descripcion: "Cervezas", monto: 10, categoria: "bebidas", alcance: "fijo", pagador_ids: ["p1"], participante_ids: [], modo: "igual", etiquetas: [], confianza: .9, dudas: [] }], tareas: [], eventos: [], album: { pie: "Compras", evento_id: null } });
  const j = await (await pedir({ imagen: "data:image/jpeg;base64,QUJD", modo: "auto", contexto: ctx }, { ip: "13.0.0.1" })).json();
  respuesta = antes; recibo = { es_comprobante: false };
  assert.equal(j.propuesta.gastos.length, 1); assert.equal(j.propuesta.gastos[0].monto, 16); assert.equal(j.propuesta.gastos[0].factura.items.length, 2); assert.equal(j.propuesta.album, null);
});
console.log(`${ok} casos OK (v44)`);

await caso("v46 · outfit: la IA arma las piezas del look para ella (sin texto ni foto)", async () => {
  let visto = null; globalThis.fetch = async (url, init) => { visto = JSON.parse(init.body); return gem({ titulo: "Lino crudo y brisa", piezas: [{ parte: "Vestido", idea: "Vestido de lino blanco hasta el tobillo" }, { parte: "Zapatos", idea: "Sandalias de cuero" }], tip: "Lleva un chal" })(); };
  const r = await w.fetch(new Request("https://casablanca.fieldbuil.ai/api/ia", { method: "POST", headers: { "content-type": "application/json", origin: "https://casablanca.fieldbuil.ai", "cf-connecting-ip": "14.0.0.1" }, body: JSON.stringify({ modo: "outfit", texto: "", contexto: { look: { nombre: "Welcome White Night", paleta: ["#FFFFFF"], ideas: ["Lino blanco"] }, para: "ella" } }) }), { GEMINI_API_KEY: "k", ASSETS });
  const j = await r.json(); assert.equal(r.status, 200, JSON.stringify(j)); assert.equal(j.outfit.piezas.length, 2); assert.equal(j.outfit.titulo, "Lino crudo y brisa");
  assert.ok(visto.systemInstruction.parts[0].text.includes("estilista") && visto.contents[0].parts[0].text.includes("ella (mujer)"));
});
console.log(`${ok} casos OK (v46 outfit)`);

await caso("v47 · /api/arte/salida: dibuja con la llave de Gemini (salta la llave sin saldo) y devuelve la imagen", async () => {
  const BUENA = "AIza" + "c".repeat(35), MALA = "AIza" + "d".repeat(35); const png = btoa("PNGFALSO");
  globalThis.fetch = async (url, init) => { const k = init.headers["x-goog-api-key"];
    if (k === MALA) return new Response(JSON.stringify({ error: { message: "depleted" } }), { status: 402 });
    if (String(url).includes("gemini-3-pro-image")) return new Response(JSON.stringify({ error: { message: "no longer available" } }), { status: 404 });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: png } }] } }] }), { status: 200 }); };
  const r = await w.fetch(new Request("https://x/api/arte/salida", { headers: { "cf-connecting-ip": "15.0.0.1" } }), { GEMINI_API_KEY: MALA, otra: BUENA, ASSETS });
  assert.equal(r.status, 200); assert.equal(r.headers.get("content-type"), "image/png"); assert.equal(await r.text(), "PNGFALSO");
  const no = await w.fetch(new Request("https://x/api/arte/otracosa"), { GEMINI_API_KEY: BUENA, ASSETS }); assert.equal(no.status, 404);
});
console.log(`${ok} casos OK (v47 arte)`);

await caso("v48 · /api/arte-gen dibuja un plato estilo restaurante (y rechaza tipos raros)", async () => {
  let prompt = ""; globalThis.fetch = async (url, init) => { prompt = JSON.parse(init.body).contents[0].parts[0].text; return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/jpeg", data: btoa("JPG") } }] } }] }), { status: 200 }); };
  const pedirArte = (b, ip) => w.fetch(new Request("https://casablanca.fieldbuil.ai/api/arte-gen", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": ip }, body: JSON.stringify(b) }), { GEMINI_API_KEY: "AIza" + "e".repeat(35), ASSETS });
  const r = await pedirArte({ tipo: "plato", titulo: "Ceviche de camarón", detalle: "camarón, limón, cebolla" }, "16.0.0.1");
  assert.equal(r.status, 200); assert.equal(r.headers.get("content-type"), "image/jpeg"); assert.ok(/restaurante/.test(prompt) && /Ceviche de camar/.test(prompt));
  assert.equal((await pedirArte({ tipo: "cualquiera", titulo: "x" }, "16.0.0.2")).status, 400);
});
console.log(`${ok} casos OK (v48 arte a pedido)`);

await caso("v51 · /api/arte: catálogo (carros blancos, itinerario, juegos) y nada fuera de él", async () => {
  let prompt = ""; globalThis.fetch = async (url, init) => { prompt = JSON.parse(init.body).contents[0].parts[0].text; return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: btoa("PNG") } }] } }] }), { status: 200 }); };
  const env = { GEMINI_API_KEY: "AIza" + "f".repeat(35), ASSETS };
  const l = await (await w.fetch(new Request("https://x/api/arte"), env)).json();
  for (const k of ["carro-lexus", "carro-amarok", "ev-salida", "ev-ceviche", "ev-micheladas", "ev-fogata", "juego-trivia", "act-voley", "look-welcome-white-ella"]) assert.ok(l.claves.includes(k), k);
  const r = await w.fetch(new Request("https://x/api/arte/carro-amarok", { headers: { "cf-connecting-ip": "17.0.0.1" } }), env);
  assert.equal(r.status, 200); assert.ok(/Amarok BLANCA/.test(prompt), "la Amarok es blanca");
  assert.equal((await w.fetch(new Request("https://x/api/arte/ev-inventado"), env)).status, 404);
  assert.equal((await w.fetch(new Request("https://x/api/arte/../secreto"), env)).status !== 200, true);
});
await caso("v51 · /api/canciones: busca en iTunes y entrega título, artista, portada y muestra", async () => {
  let pedida = ""; globalThis.fetch = async (url) => { pedida = String(url); return new Response(JSON.stringify({ results: [{ trackId: 1, trackName: "Bailando", artistName: "Enrique Iglesias", artworkUrl100: "https://a/100x100bb.jpg", previewUrl: "https://p.m4a", releaseDate: "2014-01-01" }] }), { status: 200 }); };
  const r = await w.fetch(new Request("https://x/api/canciones?q=bailando", { headers: { "cf-connecting-ip": "18.0.0.1" } }), { ASSETS });
  const j = await r.json(); assert.equal(j.canciones[0].titulo, "Bailando"); assert.equal(j.canciones[0].portada, "https://a/300x300bb.jpg");
  assert.ok(pedida.includes("itunes.apple.com/search") && pedida.includes("entity=song"));
  assert.equal((await (await w.fetch(new Request("https://x/api/canciones?q=a"), { ASSETS })).json()).canciones.length, 0);
});
console.log(`${ok} casos OK (v51 catálogo de imágenes y canciones)`);

await caso("v52 · modo guia: la IA mira las fotos de Insta del look y arma la guía (él y ella)", async () => {
  let visto = null; globalThis.fetch = async (url, init) => { visto = JSON.parse(init.body); return gem({ titulo: "Blanco y oro", resumen: "Todo blanco con toques dorados.", colores: ["blanco", "dorado"], el: [{ parte: "Arriba", idea: "Camisa de lino blanca" }], ella: [{ parte: "Vestido", idea: "Vestido largo blanco" }], tips: ["Sandalias planas para la arena"] })(); };
  const foto = "data:image/jpeg;base64," + btoa("FOTO");
  const r = await w.fetch(new Request("https://x/api/ia", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "19.0.0.1" }, body: JSON.stringify({ modo: "guia", texto: "todos de blanco", imagenes: [foto, foto], contexto: { look: { nombre: "Welcome White Night", paleta: ["#FFFFFF"] } } }) }), { GEMINI_API_KEY: "AIza" + "g".repeat(35), ASSETS });
  const j = await r.json(); assert.equal(r.status, 200, JSON.stringify(j)); assert.equal(j.guia.el[0].idea, "Camisa de lino blanca"); assert.equal(j.guia.fotos, 2);
  assert.equal(visto.contents[0].parts.filter((p) => p.inlineData).length, 2, "manda las 2 fotos"); assert.ok(visto.contents[0].parts.at(-1).text.includes("todos de blanco"));
});
console.log(`${ok} casos OK (v52 guía del look)`);
