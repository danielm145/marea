// ============================================================================
// CASABLANCA · SAME · Worker de Cloudflare
// Sirve la app (./public) y una sola puerta de IA:
//
//   POST /api/ia        texto y/o foto → PROPUESTA (gastos, tareas, planes, foto para el álbum)
//   GET  /api/ia/salud  ¿hay IA conectada? (sin gastar nada)
//
// Motor (el primero que tenga llave, como secreto del Worker — nunca en el código):
//   1. GOOGLE_SA_B64   → Vertex AI con la cuenta de servicio de la empresa (la misma de AERO EC:
//                         JWT RS256 firmado aquí con crypto.subtle → token de 1 h, cacheado)
//   2. VERTEX_API_KEY  → Vertex AI (modo express)
//   3. GEMINI_API_KEY  → Gemini API · generativelanguage.googleapis.com
// Se cargan con scripts/ia.sh (busca la cuenta de servicio en el Mac y la sube como secreto).
//
// La IA NUNCA guarda nada: devuelve una propuesta que la persona revisa y confirma en la app.
// ============================================================================

const MODELO_DEF = "gemini-2.5-flash";
const MAX_CUERPO = 6 * 1024 * 1024;           // una foto achicada en el teléfono pesa ~300 KB
const TOPE = { ventanaMs: 10 * 60 * 1000, max: 40 };  // por IP, por instancia: freno contra abuso

const CATEGORIAS = ["hospedaje", "despensa", "bebidas", "cocinera", "logistica", "restaurantes", "transporte", "actividades", "otros"];
const GRUPOS = ["Comida", "Bebidas", "Logística", "Casa", "Actividades", "Compras", "Turnos"];

const S = (extra = {}) => ({ type: "STRING", ...extra });
const N = (extra = {}) => ({ type: "NUMBER", ...extra });
const A = (items, extra = {}) => ({ type: "ARRAY", items, ...extra });
const O = (properties, required, extra = {}) => ({ type: "OBJECT", properties, required, ...extra });

const ESQUEMA = O({
  resumen: S(),
  gastos: A(O({
    descripcion: S(), monto: N(), fecha: S({ nullable: true }),
    categoria: S({ enum: CATEGORIAS }), alcance: S({ enum: ["fijo", "consumo"] }),
    pagador_ids: A(S()), participante_ids: A(S()),
    modo: S({ enum: ["igual", "porcentaje", "monto"] }),
    partes: A(O({ persona_id: S(), valor: N() }, ["persona_id", "valor"]), { nullable: true }),
    pago_entre: O({ de_id: S(), a_id: S() }, ["de_id", "a_id"], { nullable: true }),
    evento_id: S({ nullable: true }),
    factura: O({
      tipo_documento: S({ enum: ["factura", "ticket", "transferencia", "otro"] }),
      comercio: S({ nullable: true }), ruc: S({ nullable: true }), numero: S({ nullable: true }),
      clave_acceso: S({ nullable: true }), fecha: S({ nullable: true }),
      items: A(O({ descripcion: S(), cantidad: N({ nullable: true }), total: N({ nullable: true }) }, ["descripcion"])),
      subtotal: N({ nullable: true }), impuestos: N({ nullable: true }), propina: N({ nullable: true }), total: N({ nullable: true }),
    }, ["tipo_documento", "items"], { nullable: true }),
    etiquetas: A(S()), confianza: N(), dudas: A(S()),
  }, ["descripcion", "monto", "categoria", "alcance", "pagador_ids", "participante_ids", "modo", "confianza", "dudas", "etiquetas"])),
  tareas: A(O({
    titulo: S(), detalle: S({ nullable: true }), grupo: S({ enum: GRUPOS }),
    prioridad: S({ enum: ["alta", "media", "baja"] }), responsable_id: S({ nullable: true }),
    fecha: S({ nullable: true }), evento_id: S({ nullable: true }), subtareas: A(S()),
  }, ["titulo", "grupo", "prioridad", "subtareas"])),
  eventos: A(O({
    titulo: S(), tematica: S({ nullable: true }), descripcion: S({ nullable: true }),
    dia: S({ nullable: true }), hora: S({ nullable: true }), bloque: S({ enum: ["manana", "tarde", "atardecer", "noche"], nullable: true }),
    lugar: S({ nullable: true }), dress_code: S({ nullable: true }), lista: A(S()), menu: A(S()),
  }, ["titulo"])),
  album: O({ pie: S(), evento_id: S({ nullable: true }) }, ["pie"], { nullable: true }),
  portada: O({ evento_id: S() }, ["evento_id"], { nullable: true }),
  viaje: O({ desde: S({ nullable: true }), hasta: S({ nullable: true }), lugar: S({ nullable: true }), nombre: S({ nullable: true }) }, [], { nullable: true }),
}, ["resumen", "gastos", "tareas", "eventos"]);

const SISTEMA = `Eres la IA de "Casablanca", la app de un viaje de 8 amigos a Same, Esmeraldas (Ecuador).
Recibes lo que alguien cuenta (texto y/o una foto) y devuelves una PROPUESTA que esa persona revisa antes de guardar.
Decide tú qué es: un gasto, una lista de tareas, un plan nuevo, o una foto del viaje para el álbum. Puede ser más de una cosa.

Gastos y comprobantes:
1. NUNCA inventes un monto. Si no se lee, monto = 0, confianza < 0.3 y la duda en "dudas". Un vacío honesto vale más que un número inventado.
2. El TOTAL manda. IVA y propina van dentro del monto; además se detallan en "factura". Copia comercio, RUC (13 dígitos en Ecuador), fecha (AAAA-MM-DD) e ítems tal como se leen; si un dato no se ve, null.
3. Categorías: hospedaje (casa, anticipo), despensa (supermercado, víveres), bebidas (bar, hielo, licor), cocinera (pagos a la cocinera), logistica (equipo, carbón, parlante, proyector), restaurantes (comer afuera), transporte, actividades (lancha, clases), otros.
4. alcance: "fijo" si es un costo de todo el grupo (casa, cocinera, despensa común); "consumo" si es de algunos.
5. Captura de transferencia entre dos personas del viaje: es un pago entre ellos. Llena pago_entre con sus ids; tipo_documento "transferencia".
6. Nombres → ids de "personas" del contexto (compara con nombre y apodo, sin tildes). "todos" o nada dicho = TODOS los ids en participante_ids. "menos X" saca a X. Si un nombre es ambiguo (dos personas con el mismo nombre de pila) NO adivines: déjalo fuera y dilo en dudas.
7. Quien escribe suele ser quien pagó: "pagué" o nada dicho → pagador_ids = [autor_id].
8. modo "igual" salvo que pidan porcentajes o montos por persona (que deben sumar 100 o el monto).
9. etiquetas: 2 o 3 palabras cortas en minúscula (ej. "hielo", "parrillada").
10. evento_id: si menciona una noche o actividad del contexto (karaoke, BBQ, pizza, tapas, restaurante, yoga…), su id.

Tareas (si es una lista o un pendiente): una por acción; si comparten verbo ("comprar hielo, carbón y…") repite el verbo. Prioridad alta si dice urgente, hoy, ya o antes de algo. responsable_id solo si se nombra a alguien sin duda.

Planes (si proponen una actividad o piden cambiar una): titulo corto y con gracia; tematica en 2-4 palabras;
descripcion de 2 o 3 frases cálidas que digan qué se hace y cómo va; bloque (manana, tarde, atardecer o noche);
hora HH:MM si se dice o se deduce; dia AAAA-MM-DD solo si lo dicen; lugar uno de: casa, playa, piscina, terraza,
sala, restaurante; dress_code de preferencia uno de "looks" del contexto (o uno corto que inventes si piden otro);
lista = hasta 8 cosas que hay que llevar o comprar; menu = platos y bebidas si hay comida.
Si el contexto trae "plan_actual", la persona quiere CAMBIAR ese plan: devuelve en eventos UN solo plan, el mismo
completo, con todos sus campos y solo lo que pidió cambiado. Nada de gastos ni tareas en ese caso.

Foto del viaje (gente, playa, comida servida, paisaje — NO una factura ni un ticket): llena "album" con un pie de foto corto, cálido y sin emojis (máx. 70 caracteres) y su evento_id si se nota. Si la foto es un comprobante, album = null.

Foto de portada: si piden poner o cambiar la foto (portada) de un plan ("ponla de portada del círculo de intenciones",
"cambia la foto del evento de panzazos"), llena portada = { evento_id } con el id de ese plan del contexto y NO armes
gasto, tarea ni plan. Si no se sabe cuál plan es, evento_id = "".

Datos del viaje: si dicen las fechas del viaje, el lugar o el nombre ("el viaje es del 28 de octubre al 1 de
noviembre"), llena viaje con SOLO lo que cambia (fechas AAAA-MM-DD; el año, el de "hoy" del contexto) y nada más.

"resumen": una frase corta y cálida que diga lo que entendiste (ej. "Gasto de $48 en hielo y cervezas, lo pagaste tú y va para todos menos Naty").
Responde en español, descripciones cortas (máx. 60 caracteres), sin emojis.`;

const json = (status, obj, extra = {}) => new Response(JSON.stringify(obj), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
});

const visitas = new Map();
function frenado(ip) {
  const ahora = Date.now(), v = (visitas.get(ip) || []).filter((t) => ahora - t < TOPE.ventanaMs);
  v.push(ahora); visitas.set(ip, v);
  if (visitas.size > 5000) visitas.clear();
  return v.length > TOPE.max;
}

// Token de Vertex desde la cuenta de servicio (mismo camino que vertexToken() de AERO EC).
let TOKEN = { valor: null, vence: 0, sa: "" };
export async function vertexToken(env) {
  if (TOKEN.valor && TOKEN.sa === env.GOOGLE_SA_B64 && Date.now() < TOKEN.vence) return TOKEN.valor;
  const sa = JSON.parse(atob(env.GOOGLE_SA_B64));
  const b64u = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const ahora = Math.floor(Date.now() / 1000), enc = (o) => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const cab = enc({ alg: "RS256", typ: "JWT" });
  const cue = enc({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/cloud-platform", aud: "https://oauth2.googleapis.com/token", iat: ahora, exp: ahora + 3600 });
  const der = Uint8Array.from(atob(sa.private_key.replace(/-----[A-Z ]+-----/g, "").replace(/\s/g, "")), (x) => x.charCodeAt(0));
  const k = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const fir = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", k, new TextEncoder().encode(cab + "." + cue));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" + cab + "." + cue + "." + b64u(new Uint8Array(fir)) });
  const t = await r.json().catch(() => ({}));
  if (!t.access_token) throw new Error("Vertex no dio token (" + (t.error_description || t.error || r.status) + ")");
  TOKEN = { valor: t.access_token, vence: Date.now() + 50 * 60 * 1000, sa: env.GOOGLE_SA_B64 };
  return t.access_token;
}

function motorDe(env) {
  const modelo = env.IA_MODELO || MODELO_DEF;
  if (env.GOOGLE_SA_B64) {
    let proyecto = null; try { proyecto = JSON.parse(atob(env.GOOGLE_SA_B64)).project_id; } catch { /* secreto mal pegado */ }
    if (proyecto) { const loc = env.VERTEX_LOCATION || "us-central1";
      return { nombre: "vertex", modelo, sa: true,
        url: `https://${loc}-aiplatform.googleapis.com/v1/projects/${proyecto}/locations/${loc}/publishers/google/models/${modelo}:generateContent` }; }
  }
  if (env.VERTEX_API_KEY) return { nombre: "vertex", modelo, key: env.VERTEX_API_KEY,
    url: `https://aiplatform.googleapis.com/v1/publishers/google/models/${modelo}:generateContent` };
  if (env.GEMINI_API_KEY) return { nombre: "gemini", modelo, key: env.GEMINI_API_KEY,
    url: `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent` };
  return null;
}

// "data:image/jpeg;base64,...." → { mimeType, data }
function partirDataUrl(u) {
  const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(String(u || ""));
  if (!m) return null;
  const tipo = m[1].toLowerCase();
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(tipo) && tipo !== "application/pdf") return null;
  return { mimeType: tipo, data: m[2] };
}

const txt = (v, n = 200) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const num = (v) => (typeof v === "number" && isFinite(v) ? Math.round(v * 100) / 100 : 0);
const fechaOk = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

// un plan, con solo los campos y valores que la app entiende
function planDe(e) {
  const lista = (v, n) => (Array.isArray(v) ? v : []).map((x) => txt(typeof x === "string" ? x : x?.txt, 80)).filter(Boolean).slice(0, n);
  return { titulo: txt(e.titulo, 80), tematica: txt(e.tematica, 80) || null, descripcion: txt(e.descripcion, 600) || null,
    dia: fechaOk(e.dia), hora: /^\d{2}:\d{2}/.test(e.hora || "") ? String(e.hora).slice(0, 5) : null,
    bloque: ["manana", "tarde", "atardecer", "noche"].includes(e.bloque) ? e.bloque : null,
    lugar: txt(e.lugar, 80) || null, dress_code: txt(e.dress_code, 80) || null, lista: lista(e.lista, 12), menu: lista(e.menu, 15) };
}

// La IA propone; aquí se revisa que solo use ids reales y valores permitidos.
export function limpiar(p, ctx) {
  const ids = new Set((ctx.personas || []).map((x) => x.id)), evs = new Set((ctx.eventos || []).map((x) => x.id));
  const persona = (v) => (ids.has(v) ? v : null), evento = (v) => (evs.has(v) ? v : null);
  const lista = (v) => [...new Set((Array.isArray(v) ? v : []).filter((x) => ids.has(x)))];
  const out = { resumen: txt(p?.resumen, 300), gastos: [], tareas: [], eventos: [], album: null, portada: null, viaje: null };
  for (const g of (Array.isArray(p?.gastos) ? p.gastos : []).slice(0, 10)) {
    const pag = lista(g.pagador_ids), part = lista(g.participante_ids);
    const f = g.factura && typeof g.factura === "object" ? g.factura : null;
    out.gastos.push({
      descripcion: txt(g.descripcion, 80) || "Gasto", monto: Math.max(0, num(g.monto)), fecha: fechaOk(g.fecha),
      categoria: CATEGORIAS.includes(g.categoria) ? g.categoria : "otros",
      alcance: g.alcance === "fijo" ? "fijo" : "consumo",
      pagador_ids: pag.length ? pag : (ids.has(ctx.autor_id) ? [ctx.autor_id] : []),
      participante_ids: part.length ? part : [...ids],
      modo: ["igual", "porcentaje", "monto"].includes(g.modo) ? g.modo : "igual",
      partes: Array.isArray(g.partes) ? g.partes.filter((x) => ids.has(x?.persona_id)).map((x) => ({ persona_id: x.persona_id, valor: num(x.valor) })) : null,
      pago_entre: g.pago_entre && persona(g.pago_entre.de_id) && persona(g.pago_entre.a_id) ? { de_id: g.pago_entre.de_id, a_id: g.pago_entre.a_id } : null,
      evento_id: evento(g.evento_id),
      factura: f ? {
        tipo_documento: ["factura", "ticket", "transferencia", "otro"].includes(f.tipo_documento) ? f.tipo_documento : "otro",
        comercio: txt(f.comercio, 80) || null, ruc: /^\d{13}$/.test(f.ruc || "") ? f.ruc : null, numero: txt(f.numero, 30) || null,
        clave_acceso: /^\d{49}$/.test(f.clave_acceso || "") ? f.clave_acceso : null, fecha: fechaOk(f.fecha),
        items: (Array.isArray(f.items) ? f.items : []).slice(0, 40).map((i) => ({ descripcion: txt(i?.descripcion, 80), cantidad: typeof i?.cantidad === "number" ? i.cantidad : null, total: typeof i?.total === "number" ? num(i.total) : null })),
        subtotal: typeof f.subtotal === "number" ? num(f.subtotal) : null, impuestos: typeof f.impuestos === "number" ? num(f.impuestos) : null,
        propina: typeof f.propina === "number" ? num(f.propina) : null, total: typeof f.total === "number" ? num(f.total) : null,
      } : null,
      etiquetas: (Array.isArray(g.etiquetas) ? g.etiquetas : []).map((e) => txt(e, 24).toLowerCase()).filter(Boolean).slice(0, 4),
      confianza: Math.min(1, Math.max(0, typeof g.confianza === "number" ? g.confianza : 0.5)),
      dudas: (Array.isArray(g.dudas) ? g.dudas : []).map((d) => txt(d, 200)).filter(Boolean).slice(0, 5),
    });
  }
  for (const t of (Array.isArray(p?.tareas) ? p.tareas : []).slice(0, 30)) {
    if (!txt(t?.titulo)) continue;
    out.tareas.push({ titulo: txt(t.titulo, 100), detalle: txt(t.detalle, 300) || null, grupo: GRUPOS.includes(t.grupo) ? t.grupo : "Logística",
      prioridad: ["alta", "media", "baja"].includes(t.prioridad) ? t.prioridad : "media", responsable_id: persona(t.responsable_id),
      fecha: fechaOk(t.fecha), evento_id: evento(t.evento_id), etiquetas: [],
      subtareas: (Array.isArray(t.subtareas) ? t.subtareas : []).map((s) => txt(s, 80)).filter(Boolean).slice(0, 12) });
  }
  for (const e of (Array.isArray(p?.eventos) ? p.eventos : []).slice(0, 5)) {
    if (!txt(e?.titulo)) continue;
    out.eventos.push(planDe(e));
  }
  if (p?.viaje && typeof p.viaje === "object") {
    const v = { desde: fechaOk(p.viaje.desde), hasta: fechaOk(p.viaje.hasta), lugar: txt(p.viaje.lugar, 80) || null, nombre: txt(p.viaje.nombre, 60) || null };
    if (v.desde || v.hasta || v.lugar || v.nombre) out.viaje = v;
  }
  if (p?.portada && typeof p.portada === "object") out.portada = { evento_id: evento(p.portada.evento_id) || "" };
  if (p?.album && txt(p.album.pie)) out.album = { pie: txt(p.album.pie, 90), evento_id: evento(p.album.evento_id) };
  return out;
}

async function pensar(env, motor, cuerpo) {
  const ctx = cuerpo.contexto || {};
  const contexto = {
    autor_id: txt(ctx.autor_id, 64), autor: txt(ctx.autor, 60), hoy: fechaOk(ctx.hoy), moneda: txt(ctx.moneda, 5) || "USD",
    modo: ["gasto", "tareas", "plan", "auto"].includes(cuerpo.modo) ? cuerpo.modo : "auto",
    looks: (Array.isArray(ctx.looks) ? ctx.looks : []).slice(0, 20).map((x) => txt(x, 60)).filter(Boolean),
    plan_actual: ctx.plan_actual && typeof ctx.plan_actual === "object" ? planDe(ctx.plan_actual) : undefined,
    personas: (Array.isArray(ctx.personas) ? ctx.personas : []).slice(0, 40).map((x) => ({ id: txt(x?.id, 64), nombre: txt(x?.nombre, 60), apodo: txt(x?.apodo, 40) || undefined })),
    eventos: (Array.isArray(ctx.eventos) ? ctx.eventos : []).slice(0, 60).map((x) => ({ id: txt(x?.id, 64), titulo: txt(x?.titulo, 80), dia: fechaOk(x?.dia) })),
    comercios_conocidos: (Array.isArray(ctx.comercios) ? ctx.comercios : []).slice(0, 40),
  };
  const pista = contexto.plan_actual ? "\nLa persona quiere CAMBIAR el plan_actual." : contexto.modo === "plan" ? "\nLa persona propone un PLAN o actividad." : contexto.modo === "tareas" ? "\nLa persona dijo que es una LISTA DE TAREAS." : contexto.modo === "gasto" ? "\nLa persona dijo que es un GASTO o comprobante." : "";
  const partes = [];
  const img = cuerpo.imagen ? partirDataUrl(cuerpo.imagen) : null;
  if (cuerpo.imagen && !img) return { status: 400, cuerpo: { error: "La foto no se pudo leer (formato no válido)." } };
  if (img) partes.push({ inlineData: img });
  partes.push({ text: `CONTEXTO:\n${JSON.stringify(contexto)}${pista}\n\nMENSAJE DE ${contexto.autor || "alguien"}:\n${txt(cuerpo.texto, 4000) || "(solo la foto)"}` });

  const auth = motor.sa ? { authorization: "Bearer " + await vertexToken(env) } : { "x-goog-api-key": motor.key };
  const llamar = (conEsquema) => fetch(motor.url, {
    method: "POST",
    headers: { "content-type": "application/json", ...auth },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SISTEMA + (conEsquema ? "" : "\nDevuelve SOLO un JSON con: resumen, gastos[], tareas[], eventos[], album (o null).") }] },
      contents: [{ role: "user", parts: partes }],
      generationConfig: { responseMimeType: "application/json", ...(conEsquema ? { responseSchema: ESQUEMA } : {}), temperature: 0.2, maxOutputTokens: 8192 },
    }),
  });
  let r = await llamar(true), j = await r.json().catch(() => ({}));
  // si el modelo no acepta el esquema (400), se repite pidiendo solo JSON: limpiar() revisa igual lo que vuelva
  if (r.status === 400 && /schema|response_schema|responseSchema/i.test(j?.error?.message || "")) { r = await llamar(false); j = await r.json().catch(() => ({})); }
  if (!r.ok) {
    const st = r.status === 429 ? 429 : 502;
    return { status: st, cuerpo: { error: st === 429 ? "La IA está ocupada, prueba en un momento." : "La IA no respondió.", detalle: txt(j?.error?.message, 300) } };
  }
  const cand = j?.candidates?.[0];
  const texto = (cand?.content?.parts || []).map((p) => p.text || "").join("");
  let crudo; try { crudo = JSON.parse(texto); } catch { return { status: 502, cuerpo: { error: "La IA respondió algo que no se pudo leer.", detalle: txt(cand?.finishReason, 40) } }; }
  return { status: 200, cuerpo: { propuesta: { ...limpiar(crudo, contexto), ia: true }, motor: motor.nombre, modelo: motor.modelo } };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/api/ia/salud") {
      const m = motorDe(env);
      return json(200, { ok: !!m, motor: m ? m.nombre : null, modelo: m ? m.modelo : null });
    }
    if (url.pathname === "/api/ia") {
      if (req.method !== "POST") return json(405, { error: "Usa POST" });
      const motor = motorDe(env);
      if (!motor) return json(503, { error: "La IA todavía no está conectada (falta la llave: scripts/ia.sh)." });
      const origen = req.headers.get("origin");
      if (origen && new URL(origen).host !== url.host) return json(403, { error: "Origen no permitido" });
      const ip = req.headers.get("cf-connecting-ip") || "?";
      if (frenado(ip)) return json(429, { error: "Muchas lecturas seguidas. Espera unos minutos." });
      const largo = +(req.headers.get("content-length") || 0);
      if (largo > MAX_CUERPO) return json(413, { error: "La foto es muy pesada." });
      let cuerpo; try { cuerpo = await req.json(); } catch { return json(400, { error: "Mensaje inválido" }); }
      if (!txt(cuerpo?.texto) && !cuerpo?.imagen) return json(400, { error: "Cuéntale algo o sube una foto." });
      try { const r = await pensar(env, motor, cuerpo); return json(r.status, r.cuerpo); }
      catch (e) { return json(502, { error: "La IA no respondió.", detalle: txt(String(e?.message || e), 200) }); }
    }
    if (url.pathname.startsWith("/api/")) return json(404, { error: "No existe" });
    return env.ASSETS.fetch(req);
  },
};
