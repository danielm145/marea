// ============================================================================
// CASABLANCA · SAME · Worker de Cloudflare
// Sirve la app (./public) y una sola puerta de IA:
//
//   POST /api/ia        texto y/o foto → PROPUESTA (gastos, tareas, planes, foto para el álbum)
//   GET  /api/ia/salud  ¿hay IA conectada? (sin gastar nada)
//   GET  /api/config.js la conexión a Supabase (SB_URL + SB_ANON, la llave PÚBLICA): así no va en el código.
//                       Sin esas variables la app corre en modo demo.
// Con Supabase conectado, /api/ia solo atiende a quien tiene sesión en la app (JWT de Supabase).
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
import { ARTE, ARTE_VER } from "./arte.js";

// Google retira modelos sin avisar (9-oct-2026: «gemini-2.5-flash is no longer available to new users»).
// Se prueba en orden hasta que uno responda; el que sirve se recuerda para no volver a chocar.
const MODELOS = ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-flash-latest", "gemini-3-flash", "gemini-2.0-flash"];
const MODELO_DEF = MODELOS[0];
let MODELO_VIVO = null;   // el último que respondió bien (por instancia)
const sinModelo = (status, msg) => status === 404 || (status === 400 && /not found|no longer available|not supported|is not available/i.test(msg || ""));
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
      items: A(O({ descripcion: S(), cantidad: N({ nullable: true }), total: N({ nullable: true }), para_ids: A(S()) }, ["descripcion", "para_ids"])),
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
11. TODA factura o ticket se DESGLOSA: cada producto, plato o bebida es un ítem de factura.items con descripcion corta, cantidad y total de línea (cantidad × precio), tal como se lee; supermercado, restaurante, bar, farmacia, gasolinera, todos. Si el mensaje dice quién consumió qué ("las pizzas fueron de Kevin y mías", "Naty solo tomó agua", "el bloqueador es de Ana Paula"), llena items[].para_ids con esos ids; lo compartido ("la picada entre todos") va con para_ids vacío. Si hay varios ítems y NO se dijo de quién es cada uno: para_ids vacíos, modo "igual" y en dudas la pregunta "¿Quién pidió qué? Toca las caras en cada producto." El IVA, el 10 % de servicio y la propina NO son ítems: van en impuestos y propina (la app los reparte en proporción a lo que consumió cada uno).
11b. Si el CONTEXTO trae "items_actuales" (los productos que ya están en pantalla), la persona está explicando DE QUIÉN es cada uno: devuelve UN gasto con factura.items = esos mismos ítems, en el mismo orden, con la misma descripcion y total, y solo llena para_ids según lo que dijo (vacío = de todos; "yo" = autor_id). No inventes ítems nuevos ni cambies precios.
12. "dudas" son PREGUNTAS cortas y concretas para la persona, máximo 3 ("¿Pagaste tú o Kevin?", "¿El total es 52,30? Se lee borroso"). No preguntes lo que ya quedó claro.

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

Datos del viaje: si dicen las fechas del viaje, el lugar o el nombre ("el viaje es del 9 al 12 de octubre"),
llena viaje con SOLO lo que cambia (fechas AAAA-MM-DD; el año, el de "hoy" del contexto) y nada más.

"resumen": una frase corta y cálida que diga lo que entendiste (ej. "Gasto de $48 en hielo y cervezas, lo pagaste tú y va para todos menos Naty").
Responde en español, descripciones cortas (máx. 60 caracteres), sin emojis.`;

const json = (status, obj, extra = {}) => new Response(JSON.stringify(obj), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
});

const visitas = new Map();
// las imágenes del catálogo tienen su propio freno (al publicar se piden todas de una)
const visitasArte = new Map();
function frenadoArte(ip) {
  const ahora = Date.now(), v = (visitasArte.get(ip) || []).filter((t) => ahora - t < 10 * 60 * 1000);
  v.push(ahora); visitasArte.set(ip, v);
  if (visitasArte.size > 5000) visitasArte.clear();
  return v.length > 120;
}
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

let LLAVE_VIVA = null;   // la última llave de Gemini que respondió bien (por instancia)
function llavesGemini(env) {
  const L = []; const ok = (v) => typeof v === "string" && /^(AIza[0-9A-Za-z_-]{30,}|AQ\.[0-9A-Za-z_.-]{20,})$/.test(v.trim());   // llaves viejas (AIza…) y nuevas (AQ.…)
  if (typeof env.GEMINI_API_KEY === "string" && env.GEMINI_API_KEY.trim()) L.push(env.GEMINI_API_KEY.trim());   // la de siempre, tal cual
  for (const v of Object.values(env)) if (ok(v) && !L.includes(v.trim())) L.push(v.trim());   // se guardó con otro nombre: igual sirve
  // la que respondió bien la última vez va primero (solo si sigue existiendo)
  if (LLAVE_VIVA && L.includes(LLAVE_VIVA)) { L.splice(L.indexOf(LLAVE_VIVA), 1); L.unshift(LLAVE_VIVA); }
  return L;
}
const sinSaldo = (status) => status === 402 || status === 401 || status === 403;   // esa llave no sirve: la siguiente
function motorDe(env, cual, llave) {
  const modelo = cual || env.IA_MODELO || MODELO_VIVO || MODELO_DEF;
  if (env.GOOGLE_SA_B64) {
    let proyecto = null; try { proyecto = JSON.parse(atob(env.GOOGLE_SA_B64)).project_id; } catch { /* secreto mal pegado */ }
    if (proyecto) { const loc = env.VERTEX_LOCATION || "us-central1";
      return { nombre: "vertex", modelo, sa: true,
        url: `https://${loc}-aiplatform.googleapis.com/v1/projects/${proyecto}/locations/${loc}/publishers/google/models/${modelo}:generateContent` }; }
  }
  if (env.VERTEX_API_KEY) return { nombre: "vertex", modelo, key: env.VERTEX_API_KEY,
    url: `https://aiplatform.googleapis.com/v1/publishers/google/models/${modelo}:generateContent` };
  const gem = llave || llavesGemini(env)[0];
  if (gem) return { nombre: "gemini", modelo, key: gem,
    url: `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent` };
  return null;
}
/* la lista de modelos a probar, empezando por el que ya sirvió */
function candidatos(env) { return [...new Set([env.IA_MODELO, MODELO_VIVO, ...MODELOS].filter(Boolean))]; }

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
        items: (Array.isArray(f.items) ? f.items : []).slice(0, 40).map((i) => ({ descripcion: txt(i?.descripcion, 80), cantidad: typeof i?.cantidad === "number" ? i.cantidad : null, total: typeof i?.total === "number" ? num(i.total) : null, para_ids: lista(i?.para_ids) })),
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

/* ── esquema chico y plano para LEER un comprobante: cuanto más simple el esquema, más fiel la lectura ── */
const ESQUEMA_RECIBO = O({
  es_comprobante: { type: "BOOLEAN" },
  tipo_documento: S({ enum: ["factura", "ticket", "transferencia", "otro"] }),
  comercio: S({ nullable: true }), ruc: S({ nullable: true }), numero: S({ nullable: true }), fecha: S({ nullable: true }),
  items: A(O({ descripcion: S(), cantidad: N({ nullable: true }), total: N({ nullable: true }) }, ["descripcion"])),
  subtotal: N({ nullable: true }), impuestos: N({ nullable: true }), servicio: N({ nullable: true }), propina: N({ nullable: true }), total: N({ nullable: true }),
  confianza: N(), notas: S({ nullable: true }),
}, ["es_comprobante", "tipo_documento", "items", "confianza"]);
const SISTEMA_RECIBO = `Eres un lector de comprobantes (facturas, tickets de supermercado, cuentas de restaurante, vouchers, capturas de transferencia) de Ecuador y Colombia.
Devuelve SOLO JSON con lo que se LEE en la imagen. Reglas:
- es_comprobante=false si la foto no es un comprobante (gente, playa, comida servida, paisaje): entonces items=[] y lo demás null.
- items: UNA fila por cada producto, plato o bebida impresa, en el orden del papel. descripcion corta tal como está (máx. 60 caracteres). cantidad si aparece (si no, 1). total = el valor de ESA línea (cantidad × precio). Si una línea dice "2 x 3.50 = 7.00", total es 7.00.
- NO son ítems: subtotal, IVA, servicio (10 %), propina, descuentos, "total", "cambio", "efectivo". Van en sus campos. Descuento: réstalo del subtotal.
- total = lo que se pagó (el TOTAL A PAGAR). Si no se lee, null. NUNCA inventes un número: lo que no se lee es null y bajas confianza.
- Números con coma o punto decimal como estén; dólares en Ecuador, pesos en Colombia.
- comercio: el nombre del negocio; ruc: 13 dígitos en Ecuador (si no, null); fecha AAAA-MM-DD.
- Captura de transferencia bancaria: tipo_documento "transferencia", items=[], total = el monto.
- confianza 0-1 según qué tan legible estuvo. notas: una frase si algo quedó dudoso (borroso, cortado, dos totales).`;

/* la llamada al modelo con TODOS los respaldos: otra llave si una no tiene saldo, otro modelo si lo retiraron,
   y sin esquema si el modelo no lo acepta. Devuelve { ok, j, motor, status, msg }. */
async function consultar(env, motorIni, { sistema, partes, esquema, forma, temperatura = 0.2, maxTokens = 8192 }) {
  let motor = motorIni;
  const authDe = async (m) => m.sa ? { authorization: "Bearer " + await vertexToken(env) } : { "x-goog-api-key": m.key };
  const llamar = async (conEsquema, m) => fetch(m.url, {
    method: "POST", headers: { "content-type": "application/json", ...(await authDe(m)) },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistema + (conEsquema ? "" : "\nDevuelve SOLO un JSON con esta forma exacta (sin texto alrededor):\n" + forma) }] },
      contents: [{ role: "user", parts: partes }],
      generationConfig: { responseMimeType: "application/json", ...(conEsquema ? { responseSchema: esquema } : {}), temperature: temperatura, maxOutputTokens: maxTokens },
    }),
  });
  let r = await llamar(true, motor), j = await r.json().catch(() => ({}));
  if (!r.ok && (sinModelo(r.status, j?.error?.message) || (!motor.sa && sinSaldo(r.status)))) {
    const llaves = motor.sa ? [null] : (llavesGemini(env).length ? llavesGemini(env) : [motor.key]);
    buscar: for (const k of llaves) {
      for (const m of candidatos(env)) {
        if (m === motor.modelo && (k === motor.key || k === null)) continue;
        const alt = motorDe(env, m, k); r = await llamar(true, alt); j = await r.json().catch(() => ({}));
        if (r.ok) { motor = alt; break buscar; }
        if (!motor.sa && sinSaldo(r.status)) continue buscar;
        if (!sinModelo(r.status, j?.error?.message)) { motor = alt; break buscar; }
      }
    }
  }
  if (r.status === 400 && /schema|response_schema|responseSchema|properties|nullable/i.test(j?.error?.message || "")) { r = await llamar(false, motor); j = await r.json().catch(() => ({})); }
  if (r.ok) { MODELO_VIVO = motor.modelo; if (motor.key) LLAVE_VIVA = motor.key; }
  const cand = j?.candidates?.[0];
  const texto = r.ok ? (cand?.content?.parts || []).map((p) => p.text || "").join("") : "";
  let dato = null; if (r.ok) { try { dato = JSON.parse(texto.replace(/^```(?:json)?\s*|\s*```$/g, "")); } catch { dato = null; } }
  return { ok: r.ok && dato !== null, status: r.status, msg: txt(j?.error?.message, 300) || (r.ok && dato === null ? "respuesta ilegible (" + txt(cand?.finishReason, 40) + ")" : ""), j: dato, motor };
}

const FORMA_RECIBO = `{"es_comprobante":true,"tipo_documento":"factura|ticket|transferencia|otro","comercio":"","ruc":null,"numero":null,"fecha":"AAAA-MM-DD",
"items":[{"descripcion":"","cantidad":1,"total":0}],"subtotal":0,"impuestos":0,"servicio":0,"propina":0,"total":0,"confianza":0.9,"notas":null}`;
const FORMA_PROPUESTA = `{"resumen":"","gastos":[{"descripcion":"","monto":0,"fecha":null,"categoria":"otros","alcance":"consumo","pagador_ids":[],"participante_ids":[],"modo":"igual","partes":null,"pago_entre":null,"evento_id":null,
"factura":{"tipo_documento":"ticket","comercio":null,"ruc":null,"numero":null,"clave_acceso":null,"fecha":null,"items":[{"descripcion":"","cantidad":1,"total":0,"para_ids":[]}],"subtotal":null,"impuestos":null,"propina":null,"total":null},
"etiquetas":[],"confianza":0.9,"dudas":[]}],"tareas":[],"eventos":[],"album":null,"portada":null,"viaje":null}`;

/* PASO A · leer el comprobante de la foto (esquema chico, temperatura 0) → recibo limpio o null si no es comprobante */
async function leerRecibo(env, motor, img) {
  const res = await consultar(env, motor, { sistema: SISTEMA_RECIBO, esquema: ESQUEMA_RECIBO, forma: FORMA_RECIBO, temperatura: 0, maxTokens: 4096,
    partes: [{ inlineData: img }, { text: "Lee este comprobante." }] });
  if (!res.ok) return { error: res, recibo: null, motor: res.motor };
  const r = res.j || {};
  if (r.es_comprobante === false) return { recibo: null, motor: res.motor, no_es: true };
  const sinNada = !(Array.isArray(r.items) && r.items.length) && typeof r.total !== "number" && typeof r.subtotal !== "number";
  if (sinNada && r.tipo_documento !== "transferencia") return { recibo: null, motor: res.motor, no_es: true };   // no leyó nada útil: que el intérprete vea la foto
  const items = (Array.isArray(r.items) ? r.items : []).slice(0, 60)
    .map((i) => ({ descripcion: txt(i?.descripcion, 80), cantidad: typeof i?.cantidad === "number" && i.cantidad > 0 ? i.cantidad : 1, total: typeof i?.total === "number" && i.total > 0 ? num(i.total) : null, para_ids: [] }))
    .filter((i) => i.descripcion);
  const n = (v) => (typeof v === "number" && isFinite(v) && v >= 0 ? num(v) : null);
  const propina = n(r.propina), servicio = n(r.servicio);
  const recibo = {
    tipo_documento: ["factura", "ticket", "transferencia", "otro"].includes(r.tipo_documento) ? r.tipo_documento : "ticket",
    comercio: txt(r.comercio, 80) || null, ruc: /^\d{13}$/.test(r.ruc || "") ? r.ruc : null, numero: txt(r.numero, 30) || null, clave_acceso: null, fecha: fechaOk(r.fecha),
    items, subtotal: n(r.subtotal), impuestos: n(r.impuestos),
    propina: propina != null || servicio != null ? num((propina || 0) + (servicio || 0)) : null,   // servicio y propina se reparten igual: en proporción
    total: n(r.total), confianza: Math.min(1, Math.max(0, typeof r.confianza === "number" ? r.confianza : 0.5)), notas: txt(r.notas, 200) || null,
  };
  // si no vino el total pero sí las partes, se arma; si no vino nada, queda null (la app pregunta)
  if (recibo.total == null && recibo.subtotal != null) recibo.total = num(recibo.subtotal + (recibo.impuestos || 0) + (recibo.propina || 0));
  if (recibo.total == null && items.length && items.every((i) => i.total != null)) recibo.total = num(items.reduce((a, i) => a + i.total, 0));
  return { recibo, motor: res.motor };
}

/* un gasto armado SOLO con el recibo (cuando el modelo no interpretó nada): nunca se deja a la persona sin propuesta */
function gastoDesdeRecibo(rec, contexto) {
  const t = ((rec.comercio || "") + " " + rec.items.map((i) => i.descripcion).join(" ")).toLowerCase();
  const cat = /restaurant|cevich|pizz|parrill|marisc|almuerzo|cena|desayuno|cafe|café|burger|sushi|taco/.test(t) ? "restaurantes"
    : /cervez|licor|ron|vodka|whisky|vino|hielo|bar\b|club/.test(t) ? "bebidas" : /gasolin|combustible|peaje|taxi|uber|bus|parqueo/.test(t) ? "transporte"
    : /supermerc|tía|tia\b|mi comisariato|megamaxi|supermaxi|akí|aki\b|coral|despensa|víver|viver|mercado|farmac/.test(t) ? "despensa" : /carbón|carbon|parlante|bateria|pila|cargador/.test(t) ? "logistica" : "otros";
  const todos = (contexto.personas || []).map((p) => p.id);
  return {
    descripcion: rec.comercio ? (cat === "restaurantes" ? "Cuenta en " + rec.comercio : cat === "despensa" ? "Compra en " + rec.comercio : rec.comercio) : (rec.items[0]?.descripcion || "Gasto"),
    monto: rec.total || 0, fecha: rec.fecha, categoria: cat, alcance: "fijo",
    pagador_ids: contexto.autor_id ? [contexto.autor_id] : [], participante_ids: todos, modo: "igual", partes: null, pago_entre: null, evento_id: null,
    factura: rec, etiquetas: [], confianza: rec.confianza,
    dudas: [...(rec.total ? [] : ["¿Cuánto fue el total? No se alcanzó a leer."]), ...(rec.items.length > 1 ? ["¿Quién pidió qué? Toca las caras en cada producto."] : []), ...(rec.notas ? [rec.notas] : [])],
  };
}

/* ── OUTFIT: la IA arma un look concreto para una noche temática (para él, para ella), con lo que la persona ya tenga ── */
const ESQUEMA_OUTFIT = O({
  titulo: S(), piezas: A(O({ parte: S(), idea: S() }, ["parte", "idea"])), tip: S({ nullable: true }),
}, ["titulo", "piezas"]);
const SISTEMA_OUTFIT = `Eres el estilista de un viaje de amigos a la playa en Same, Esmeraldas (Ecuador): clima cálido y húmedo, arena, noches frescas con brisa.
Te dan el LOOK de una noche temática (nombre, descripción, paleta de colores e ideas) y para quién es. Arma UN outfit concreto y fácil de conseguir:
- piezas: de 4 a 6, en este orden cuando aplique: "Arriba", "Abajo" (o "Vestido" / "Enterizo"), "Zapatos", "Accesorios", "Pelo y maquillaje" (solo para ella) o "Detalle", y "Si refresca".
- idea: corta y concreta (máx. 70 caracteres), con el color de la paleta y la tela. Nada de marcas ni cosas caras; ropa que se tiene o se consigue fácil.
- Si la persona cuenta lo que ya tiene, ÚSALO y arma el resto alrededor.
- titulo: 3 a 6 palabras con gracia ("Lino crudo y brisa de mar"). tip: una frase práctica para la playa (arena, humedad, foto del grupo).
Responde en español colombiano, cálido, sin emojis.`;
async function outfitDe(env, motor, cuerpo) {
  const L = (cuerpo.contexto && cuerpo.contexto.look) || {};
  const look = { nombre: txt(L.nombre, 80), descripcion: txt(L.descripcion, 400), paleta: (Array.isArray(L.paleta) ? L.paleta : []).slice(0, 6).map((c) => txt(c, 9)), ideas: (Array.isArray(L.ideas) ? L.ideas : []).slice(0, 10).map((i) => txt(i, 60)) };
  const para = ["el", "ella", "unisex"].includes(cuerpo.contexto?.para) ? cuerpo.contexto.para : "unisex";
  const res = await consultar(env, motor, { sistema: SISTEMA_OUTFIT, esquema: ESQUEMA_OUTFIT, temperatura: 0.8, maxTokens: 2048,
    forma: '{"titulo":"","piezas":[{"parte":"Arriba","idea":""}],"tip":""}',
    partes: [{ text: `LOOK:\n${JSON.stringify(look)}\nPARA: ${para === "el" ? "él (hombre)" : para === "ella" ? "ella (mujer)" : "cualquiera"}\nLO QUE YA TIENE O PIDE: ${txt(cuerpo.texto, 400) || "(nada en especial)"}` }] });
  if (!res.ok) return { status: res.status === 429 ? 429 : 502, cuerpo: { error: res.status === 402 ? "La llave de la IA no tiene saldo." : "La IA no respondió.", detalle: res.msg } };
  const o = res.j || {};
  const piezas = (Array.isArray(o.piezas) ? o.piezas : []).slice(0, 7).map((x) => ({ parte: txt(x?.parte, 30), idea: txt(x?.idea, 90) })).filter((x) => x.parte && x.idea);
  if (!piezas.length) return { status: 502, cuerpo: { error: "La IA no armó el outfit. Prueba otra vez." } };
  return { status: 200, cuerpo: { outfit: { titulo: txt(o.titulo, 60) || look.nombre, piezas, tip: txt(o.tip, 160) || null }, motor: res.motor.nombre, modelo: res.motor.modelo } };
}

async function pensar(env, motorIni, cuerpo) {
  let motor = motorIni;
  if (cuerpo.modo === "outfit") return outfitDe(env, motor, cuerpo);
  const ctx = cuerpo.contexto || {};
  const contexto = {
    autor_id: txt(ctx.autor_id, 64), autor: txt(ctx.autor, 60), hoy: fechaOk(ctx.hoy), moneda: txt(ctx.moneda, 5) || "USD",
    modo: ["gasto", "tareas", "plan", "auto", "items"].includes(cuerpo.modo) ? cuerpo.modo : "auto",
    looks: (Array.isArray(ctx.looks) ? ctx.looks : []).slice(0, 20).map((x) => txt(x, 60)).filter(Boolean),
    plan_actual: ctx.plan_actual && typeof ctx.plan_actual === "object" ? planDe(ctx.plan_actual) : undefined,
    personas: (Array.isArray(ctx.personas) ? ctx.personas : []).slice(0, 40).map((x) => ({ id: txt(x?.id, 64), nombre: txt(x?.nombre, 60), apodo: txt(x?.apodo, 40) || undefined })),
    eventos: (Array.isArray(ctx.eventos) ? ctx.eventos : []).slice(0, 60).map((x) => ({ id: txt(x?.id, 64), titulo: txt(x?.titulo, 80), dia: fechaOk(x?.dia) })),
    comercios_conocidos: (Array.isArray(ctx.comercios) ? ctx.comercios : []).slice(0, 40),
    items_actuales: Array.isArray(ctx.items_actuales) && ctx.items_actuales.length ? ctx.items_actuales.slice(0, 40).map((i, n) => ({ n: n + 1, descripcion: txt(i?.descripcion, 80), total: typeof i?.total === "number" ? num(i.total) : null })) : undefined,
  };
  const img = cuerpo.imagen ? partirDataUrl(cuerpo.imagen) : null;
  if (cuerpo.imagen && !img) return { status: 400, cuerpo: { error: "La foto no se pudo leer (formato no válido)." } };
  const diag = { modelo: motor.modelo, recibo: null };

  // ── PASO A · si hay foto y puede ser un comprobante, primero se LEE con el lector dedicado ──
  let recibo = null, noEsRecibo = false;
  if (img && ["auto", "gasto", "items"].includes(contexto.modo)) {
    const L = await leerRecibo(env, motor, img); motor = L.motor || motor;
    if (L.error && contexto.modo === "items") return { status: L.error.status === 429 ? 429 : 502, cuerpo: { error: L.error.status === 402 ? "La llave de la IA no tiene saldo." : "No pude leer la factura (" + (L.error.msg || L.error.status) + ")." } };
    recibo = L.recibo; noEsRecibo = !!L.no_es; diag.recibo = recibo ? { items: recibo.items.length, total: recibo.total, confianza: recibo.confianza } : (L.no_es ? "no es comprobante" : "falló: " + (L.error?.msg || ""));
  }
  if (contexto.modo === "items") {   // solo querían el desglose
    if (!recibo) return { status: 200, cuerpo: { propuesta: { resumen: noEsRecibo ? "Esa foto no parece una factura." : "No pude leer los productos.", gastos: [], tareas: [], eventos: [], album: null, portada: null, viaje: null, ia: true }, motor: motor.nombre, modelo: motor.modelo, diag } };
    return { status: 200, cuerpo: { propuesta: { ...limpiar({ resumen: "Leí " + recibo.items.length + " productos.", gastos: [gastoDesdeRecibo(recibo, contexto)], tareas: [], eventos: [] }, contexto), ia: true }, motor: motor.nombre, modelo: motor.modelo, diag } };
  }

  // ── PASO B · interpretar: qué es, de quién, para quién (con el recibo ya leído como dato fijo) ──
  const pista = contexto.items_actuales ? "\nLa persona explica DE QUIÉN es cada producto de items_actuales: devuelve esos mismos ítems con para_ids." : contexto.plan_actual ? "\nLa persona quiere CAMBIAR el plan_actual." : contexto.modo === "plan" ? "\nLa persona propone un PLAN o actividad." : contexto.modo === "tareas" ? "\nLa persona dijo que es una LISTA DE TAREAS." : contexto.modo === "gasto" ? "\nLa persona dijo que es un GASTO o comprobante." : "";
  const partes = [];
  if (img && !recibo) partes.push({ inlineData: img });   // no era comprobante (o no se pudo leer): que el modelo vea la foto
  const reciboTxt = recibo ? `\n\nCOMPROBANTE YA LEÍDO (úsalo tal cual: estos ítems, con estas descripciones y totales, en factura.items; monto = total; no inventes ni quites ítems; solo agrega para_ids si el mensaje dice de quién es cada uno):\n${JSON.stringify({ ...recibo, items: recibo.items.map(({ descripcion, cantidad, total }) => ({ descripcion, cantidad, total })) })}` : "";
  partes.push({ text: `CONTEXTO:\n${JSON.stringify(contexto)}${pista}${reciboTxt}\n\nMENSAJE DE ${contexto.autor || "alguien"}:\n${txt(cuerpo.texto, 4000) || "(solo la foto)"}` });
  const res = await consultar(env, motor, { sistema: SISTEMA, esquema: ESQUEMA, forma: FORMA_PROPUESTA, partes });
  motor = res.motor || motor;

  let out;
  if (res.ok) out = limpiar(res.j, contexto);
  else if (recibo) out = limpiar({ resumen: "Leí la factura; revisa quién pagó y entre quiénes va.", gastos: [gastoDesdeRecibo(recibo, contexto)], tareas: [], eventos: [] }, contexto);
  else {
    const st = res.status === 429 ? 429 : 502;
    const msg = res.status === 402 ? "La llave de la IA no tiene saldo: hay que recargar en Google AI Studio." : st === 429 ? "La IA está ocupada, prueba en un momento." : "La IA no respondió.";
    return { status: st, cuerpo: { error: msg, detalle: res.msg } };
  }
  // ── el recibo manda: si el modelo perdió ítems, cambió el total o no armó gasto, se corrige con lo leído ──
  if (recibo) {
    if (!out.gastos.length && !out.album && !out.portada && !out.viaje && !out.eventos.length) out.gastos.push(limpiar({ gastos: [gastoDesdeRecibo(recibo, contexto)] }, contexto).gastos[0]);
    // UNA factura = UN gasto: si el intérprete la partió en dos (o repitió el mismo), se queda el primero
    if (out.gastos.length > 1) out.gastos = [out.gastos[0]];
    if (recibo.tipo_documento !== "transferencia") out.album = null;   // un comprobante no va al álbum
    const g = out.gastos[0];
    if (g) {
      const suyos = g.factura && g.factura.items ? g.factura.items : [];
      const porNombre = new Map(suyos.map((i) => [i.descripcion.toLowerCase().replace(/[^a-z0-9]/g, ""), i]));
      const items = recibo.items.map((i) => { const m = porNombre.get(i.descripcion.toLowerCase().replace(/[^a-z0-9]/g, "")); return { ...i, para_ids: m && m.para_ids && m.para_ids.length ? m.para_ids : (suyos.length === recibo.items.length ? (suyos[recibo.items.indexOf(i)]?.para_ids || []) : []) }; });
      g.factura = { ...recibo, items };
      if (recibo.total && Math.abs((g.monto || 0) - recibo.total) > 0.011) g.monto = recibo.total;
      if (!g.monto && !g.dudas.some((d) => /total/i.test(d))) g.dudas.unshift("¿Cuánto fue el total? No se alcanzó a leer.");
      if (items.length > 1 && !items.some((i) => i.para_ids.length) && !g.dudas.some((d) => /qui[eé]n pidi/i.test(d))) g.dudas.push("¿Quién pidió qué? Toca las caras en cada producto.");
      const suma = items.reduce((a, i) => a + (i.total || 0), 0), base = recibo.subtotal || (recibo.total ? recibo.total - (recibo.impuestos || 0) - (recibo.propina || 0) : 0);
      if (base && suma && Math.abs(suma - base) > Math.max(0.5, base * 0.05)) g.dudas.push(`Los productos suman ${suma.toFixed(2)} y la factura dice ${base.toFixed(2)}: revisa si falta alguno.`);
      g.dudas = g.dudas.slice(0, 4);
    }
  }
  return { status: 200, cuerpo: { propuesta: { ...out, ia: true }, motor: motor.nombre, modelo: motor.modelo, diag } };
}

// ¿el token es de alguien con sesión en la app? (se pregunta a Supabase y se recuerda 5 min)
const SESIONES = new Map();
async function sesionValida(env, req) {
  const tok = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!tok) return false;
  const ya = SESIONES.get(tok); if (ya && ya > Date.now()) return true;
  const r = await fetch(env.SB_URL.replace(/\/$/, "") + "/auth/v1/user", { headers: { apikey: env.SB_ANON, authorization: "Bearer " + tok } }).catch(() => null);
  if (!r || !r.ok) return false;
  if (SESIONES.size > 2000) SESIONES.clear();
  SESIONES.set(tok, Date.now() + 5 * 60 * 1000); return true;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/api/config.js") {
      const sb = env.SB_URL && env.SB_ANON ? { url: env.SB_URL, anon: env.SB_ANON } : null;
      return new Response("window.MAREA_SB=" + JSON.stringify(sb) + ";\n", { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" } });
    }
    // ── ARTE con la IA de imágenes (Gemini / Vertex): ilustraciones fijas del viaje, generadas UNA vez y guardadas en el caché de Cloudflare ──
// primero los que dibujan barato (≈ 4 centavos por imagen); el «pro» solo si los demás fallan
const MODELOS_IMG = ["gemini-3.1-flash-image", "gemini-2.5-flash-image", "gemini-2.5-flash-image-preview", "gemini-3-pro-image"];
async function generarArte(env, prompt) {
  const fallas = [];
  // 1) con la cuenta de servicio de Vertex: Imagen
  if (env.GOOGLE_SA_B64) {
    try {
      const sa = JSON.parse(atob(env.GOOGLE_SA_B64)), loc = env.VERTEX_LOCATION || "us-central1";
      const r = await fetch(`https://${loc}-aiplatform.googleapis.com/v1/projects/${sa.project_id}/locations/${loc}/publishers/google/models/imagen-4.0-generate-001:predict`, {
        method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + await vertexToken(env) },
        body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: "16:9" } }) });
      const j = await r.json().catch(() => ({})); const b64 = j?.predictions?.[0]?.bytesBase64Encoded;
      if (b64) return { bytes: Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), tipo: j.predictions[0].mimeType || "image/png" };
      fallas.push("imagen-4: " + r.status);
    } catch (e) { fallas.push("vertex: " + (e.message || e)); }
  }
  // 2) con las llaves de Gemini: los modelos que dibujan
  for (const k of llavesGemini(env)) {
    for (const m of MODELOS_IMG) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": k },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE"] } }) });
      const j = await r.json().catch(() => ({}));
      const parte = (j?.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData && p.inlineData.data);
      if (parte) return { bytes: Uint8Array.from(atob(parte.inlineData.data), (c) => c.charCodeAt(0)), tipo: parte.inlineData.mimeType || "image/png" };
      fallas.push(`${m}: ${r.status}`);
      if (sinSaldo(r.status)) break;   // esta llave no sirve: la siguiente
    }
  }
  throw new Error(fallas.join(" · ").slice(0, 300) || "sin llave");
}

// la versión publicada (la lee del sw.js, que lleva CACHE='marea-vNN'): la app la compara con la suya
    if (url.pathname === "/api/arte-gen") {
      if (req.method !== "POST") return json(405, { error: "Usa POST" });
      if (!motorDe(env)) return json(503, { error: "La IA todavía no está conectada." });
      if (env.SB_URL && env.SB_ANON && !(await sesionValida(env, req))) return json(401, { error: "Entra a la app para usar la IA." });
      if (frenado(req.headers.get("cf-connecting-ip") || "?")) return json(429, { error: "Muchas imágenes seguidas. Espera unos minutos." });
      let b; try { b = await req.json(); } catch { return json(400, { error: "Mensaje inválido" }); }
      const tipo = String(b?.tipo || ""), que = txt(b?.titulo, 120), det = txt(b?.detalle, 500);
      if (!que) return json(400, { error: "Falta qué dibujar" });
      const base = "Sin texto, sin letras, sin logos, sin marcas de agua.";
      const prompt = tipo === "plato" ? `Fotografía de comida profesional estilo restaurante gourmet: ${que}${det ? " (" + det + ")" : ""}. Emplatado elegante en plato de cerámica artesanal, mesa de madera clara junto al mar, luz natural cálida de tarde, profundidad de campo, apetitoso y realista. Formato cuadrado. ${base}`
        : tipo === "outfit" ? `Fotografía de moda flat lay vista desde arriba sobre lino claro y arena: ${que}. Prendas: ${det}. Estilo editorial de revista de verano, luz natural suave, composición ordenada, colores de la paleta. Sin personas. Formato vertical 3:4. ${base}`
        : tipo === "evento" ? `Ilustración vibrante estilo póster de viaje de playa para la actividad «${que}» de un grupo de amigos en Same, Esmeraldas (Ecuador)${det ? ": " + det : ""}. Palmeras, mar Pacífico, casa blanca frente a la playa, ambiente alegre. Formato horizontal 16:9, colores cálidos y saturados, ilustración plana moderna. ${base}`
        : null;
      if (!prompt) return json(400, { error: "Tipo no válido" });
      try { const img = await generarArte(env, prompt); return new Response(img.bytes, { headers: { "content-type": img.tipo, "cache-control": "no-store" } }); }
      catch (e) { return json(502, { error: "No pude dibujarla", detalle: txt(String(e.message || e), 300) }); }
    }
    // ── KARAOKE: buscar canciones en iTunes (portada, artista y 30 s de muestra). Se recuerda 1 día ──
    if (url.pathname === "/api/canciones") {
      const q = txt(url.searchParams.get("q"), 80);
      if (q.length < 2) return json(200, { canciones: [] });
      const clave = new Request(new URL("/api/canciones?q=" + encodeURIComponent(q.toLowerCase()), req.url).toString());
      const cache = typeof caches !== "undefined" ? caches.default : null;
      if (cache) { const hit = await cache.match(clave); if (hit) return hit; }
      if (frenadoArte(req.headers.get("cf-connecting-ip") || "?")) return json(429, { error: "Espera un momento" });
      let lista = [];
      for (const pais of ["EC", "US"]) {
        const r = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=15&country=${pais}`, { headers: { "user-agent": "Casablanca/1.0" } }).catch(() => null);
        const j = r && r.ok ? await r.json().catch(() => null) : null;
        lista = (j?.results || []).filter((x) => x.trackName).map((x) => ({
          id: x.trackId, titulo: x.trackName, artista: x.artistName || "", album: x.collectionName || "",
          portada: String(x.artworkUrl100 || "").replace("100x100bb", "300x300bb"), preview: x.previewUrl || "", anio: String(x.releaseDate || "").slice(0, 4) }));
        if (lista.length) break;
      }
      const resp = new Response(JSON.stringify({ canciones: lista }), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=86400" } });
      if (cache && lista.length) await cache.put(clave, resp.clone());
      return resp;
    }
    if (url.pathname === "/api/arte") return json(200, { claves: Object.keys(ARTE), ver: ARTE_VER });
    const mArte = url.pathname.match(/^\/api\/arte\/([a-z0-9-]{2,60})$/);
    if (mArte) {
      const prompt = ARTE[mArte[1]]; if (!prompt) return json(404, { error: "No existe" });
      const clave = new Request(new URL("/api/arte/" + mArte[1] + "?v=" + ARTE_VER, req.url).toString());
      const cache = typeof caches !== "undefined" ? caches.default : null;
      if (cache) { const hit = await cache.match(clave); if (hit) return hit; }
      if (frenadoArte(req.headers.get("cf-connecting-ip") || "?")) return json(429, { error: "Espera un momento" });
      try {
        const img = await generarArte(env, prompt);
        const resp = new Response(img.bytes, { headers: { "content-type": img.tipo, "cache-control": "public, max-age=2592000, immutable" } });
        if (cache) await cache.put(clave, resp.clone());
        return resp;
      } catch (e) { return json(502, { error: "No pude dibujarla", detalle: txt(String(e.message || e), 300) }); }
    }
    if (url.pathname === "/api/version") {
      let v = null; try { const t = await (await env.ASSETS.fetch(new Request(new URL("/sw.js", req.url)))).text(); v = (t.match(/marea-(v\d+)/) || [])[1] || null; } catch { /* sin assets */ }
      return json(200, { v });
    }
    if (url.pathname === "/api/ia/salud") {
      const m = motorDe(env);
      const base = { ok: !!m, motor: m ? m.nombre : null, modelo: m ? m.modelo : null, llaves: { GOOGLE_SA_B64: !!env.GOOGLE_SA_B64, VERTEX_API_KEY: !!env.VERTEX_API_KEY, GEMINI_API_KEY: !!env.GEMINI_API_KEY, llaves_gemini: llavesGemini(env).length } };
      // ?probar=1 → prueba DE VERDAD (pide token y le hace una pregunta mínima al modelo) y dice por qué falla
      if (!m || !url.searchParams.has("probar")) return json(200, base);
      if (frenado(req.headers.get("cf-connecting-ip") || "?")) return json(429, { ...base, prueba: "espera unos minutos" });
      try {
        if (m.sa) base.proyecto = JSON.parse(atob(env.GOOGLE_SA_B64)).project_id;
        const fallas = [];
        const llaves = m.sa ? [null] : llavesGemini(env);
        for (let i = 0; i < llaves.length; i++) {
          const k = llaves[i], tag = m.sa ? "" : `llave ${i + 1}/${llaves.length} (…${k.slice(-4)}) · `;
          for (const nombre of candidatos(env)) {
            const mm = motorDe(env, nombre, k);
            const auth = mm.sa ? { authorization: "Bearer " + await vertexToken(env) } : { "x-goog-api-key": mm.key };
            const r = await fetch(mm.url, { method: "POST", headers: { "content-type": "application/json", ...auth },
              body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Responde solo: ok" }] }], generationConfig: { maxOutputTokens: 5 } }) });
            const t = await r.text(); let msg = t; try { msg = JSON.parse(t).error.message; } catch { /* texto plano */ }
            if (r.ok) { MODELO_VIVO = nombre; if (k) LLAVE_VIVA = k; return json(200, { ...base, modelo: nombre, llave: k ? "…" + k.slice(-4) : "vertex", prueba: "ok", descartados: fallas }); }
            fallas.push(`${tag}${nombre}: ${r.status} ${String(msg).slice(0, 110)}`);
            if (!m.sa && sinSaldo(r.status)) break;          // esta llave no sirve: probar la siguiente llave
            if (!sinModelo(r.status, msg)) return json(200, { ...base, ok: false, prueba: "falló: " + fallas.join(" · ").slice(0, 700) });
          }
        }
        return json(200, { ...base, ok: false, prueba: "ninguna llave sirvió: " + fallas.join(" · ").slice(0, 700) });
      } catch (e) { return json(200, { ...base, ok: false, prueba: String(e.message || e).slice(0, 300) }); }
    }
    if (url.pathname === "/api/ia") {
      if (req.method !== "POST") return json(405, { error: "Usa POST" });
      const motor = motorDe(env);
      if (!motor) return json(503, { error: "La IA todavía no está conectada (falta la llave: scripts/ia.sh)." });
      const origen = req.headers.get("origin");
      if (origen && new URL(origen).host !== url.host) return json(403, { error: "Origen no permitido" });
      if (env.SB_URL && env.SB_ANON && !(await sesionValida(env, req))) return json(401, { error: "Entra a la app para usar la IA." });
      const ip = req.headers.get("cf-connecting-ip") || "?";
      if (frenado(ip)) return json(429, { error: "Muchas lecturas seguidas. Espera unos minutos." });
      const largo = +(req.headers.get("content-length") || 0);
      if (largo > MAX_CUERPO) return json(413, { error: "La foto es muy pesada." });
      let cuerpo; try { cuerpo = await req.json(); } catch { return json(400, { error: "Mensaje inválido" }); }
      if (!txt(cuerpo?.texto) && !cuerpo?.imagen && cuerpo?.modo !== "outfit") return json(400, { error: "Cuéntale algo o sube una foto." });
      try { const r = await pensar(env, motor, cuerpo); return json(r.status, r.cuerpo); }
      catch (e) { return json(502, { error: "La IA no respondió.", detalle: txt(String(e?.message || e), 200) }); }
    }
    if (url.pathname.startsWith("/api/")) return json(404, { error: "No existe" });
    return env.ASSETS.fetch(req);
  },
};
