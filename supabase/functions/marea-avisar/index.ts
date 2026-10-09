// ============================================================================
// CASABLANCA · Edge Function marea-avisar · AVISOS PUSH (RFC 8291, cifrados de punta a punta)
// ----------------------------------------------------------------------------
// La app llama con la sesión de la persona (JWT). Acciones (POST JSON {action, ...}):
//   vapid    → { publica }                     la llave pública para suscribirse (se crea sola la 1.ª vez)
//   guardar  → { endpoint, p256dh, auth, ua }  este teléfono quiere avisos (upsert, de quien llama)
//   quitar   → { endpoint }
//   enviar   → { avisos: [{ para_id, titulo, cuerpo, url }] }  → { enviados, fallidos }
// Nunca se avisa a quien llama. Un teléfono que falla 3 veces seguidas (o responde 404/410) se borra.
// Mismo cifrado que el Portal EC (worker.js «NOTIFICACIONES PUSH»), portado a Deno.
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP = Deno.env.get("MAREA_APP_ORIGIN") ?? "https://casablanca.fieldbuil.ai";
const admin = createClient(URL, SRK, { auth: { persistSession: false, autoRefreshToken: false }, db: { schema: "marea" } });

const ORIGENES = new Set([APP, "https://casablanca.fieldbuil.ai", "https://marea.fieldbuil.ai", "https://marea.daniel-martinez9094.workers.dev", "http://localhost:8787", "http://localhost:3000"]);
function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  return { "Access-Control-Allow-Origin": ORIGENES.has(o) ? o : APP, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
}
const reply = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" } });

const b64uDec = (s: string) => Uint8Array.from(atob(String(s).replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const b64uEnc = (u8: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(u8))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unir = (...arr: Uint8Array[]) => { const out = new Uint8Array(arr.reduce((n, a) => n + a.length, 0)); let i = 0; for (const a of arr) { out.set(a, i); i += a.length; } return out; };
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, largo: number) {
  const base = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, base, largo * 8));
}

/* la pareja VAPID: se crea una sola vez y vive en marea.push_vapid */
let VAPID: { publica: string; privada_d: string } | null = null;
async function vapid() {
  if (VAPID) return VAPID;
  const { data } = await admin.from("push_vapid").select("publica,privada_d").eq("id", 1).maybeSingle();
  if (data) return (VAPID = data);
  const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", par.privateKey);
  const publica = b64uEnc(new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey)));
  const fila = { id: 1, publica, privada_d: jwk.d! };
  const { error } = await admin.from("push_vapid").insert(fila);
  if (error) {   // otra instancia la creó al mismo tiempo: se usa la que quedó
    const { data: d2 } = await admin.from("push_vapid").select("publica,privada_d").eq("id", 1).single();
    return (VAPID = d2!);
  }
  return (VAPID = { publica, privada_d: fila.privada_d });
}

async function enviarUno(sub: { endpoint: string; p256dh: string; auth: string }, datos: unknown) {
  const v = await vapid();
  const origen = new URL(sub.endpoint).origin;
  const pub = b64uDec(v.publica);
  const jwk = { kty: "EC", crv: "P-256", d: v.privada_d, x: b64uEnc(pub.slice(1, 33)), y: b64uEnc(pub.slice(33, 65)), ext: true };
  const firmante = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const te = new TextEncoder();
  const cab = b64uEnc(te.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const cue = b64uEnc(te.encode(JSON.stringify({ aud: origen, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:daniel@fieldbuil.ai" })));
  const firma = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, firmante, te.encode(cab + "." + cue));
  const jwt = cab + "." + cue + "." + b64uEnc(firma);

  const ua = b64uDec(sub.p256dh), authSec = b64uDec(sub.auth);
  const efimero = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", efimero.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const compartido = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, efimero.privateKey, 256));
  const prk = await hkdf(authSec, compartido, unir(te.encode("WebPush: info\0"), ua, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, prk, te.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, prk, te.encode("Content-Encoding: nonce\0"), 12);
  const claro = unir(te.encode(JSON.stringify(datos)), new Uint8Array([2]));
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, claro));
  const cuerpo = unir(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([asPub.length]), asPub, cifrado);
  const r = await fetch(sub.endpoint, { method: "POST", body: cuerpo, headers: {
    Authorization: "vapid t=" + jwt + ", k=" + v.publica, "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "86400", Urgency: "normal" } });
  return r.status;
}

const txt = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "POST" });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return reply(req, 401, { error: "sin token" });
  const { data: caller } = await admin.auth.getUser(token);
  if (!caller?.user) return reply(req, 401, { error: "token inválido" });
  const { data: yo } = await admin.from("personas").select("id,nombre,apodo,activo").eq("auth_id", caller.user.id).maybeSingle();
  if (!yo?.activo) return reply(req, 403, { error: "sin acceso" });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return reply(req, 400, { error: "JSON inválido" }); }
  const action = String(body.action || "");
  try {
    if (action === "vapid") return reply(req, 200, { publica: (await vapid()).publica });

    if (action === "guardar") {
      const endpoint = txt(body.endpoint, 1000), p256dh = txt(body.p256dh, 200), auth = txt(body.auth, 100);
      if (!/^https:\/\//.test(endpoint) || !p256dh || !auth) return reply(req, 400, { error: "suscripción incompleta" });
      const { error } = await admin.from("push_subs").upsert({ persona_id: yo.id, endpoint, p256dh, auth, ua: txt(body.ua, 200) || null, fallos: 0 }, { onConflict: "endpoint" });
      if (error) throw error;
      return reply(req, 200, { ok: true });
    }
    if (action === "quitar") {
      await admin.from("push_subs").delete().eq("endpoint", txt(body.endpoint, 1000)).eq("persona_id", yo.id);
      return reply(req, 200, { ok: true });
    }
    if (action === "enviar") {
      const avisos = (Array.isArray(body.avisos) ? body.avisos : []).slice(0, 60) as Record<string, unknown>[];
      const paraIds = [...new Set(avisos.map((a) => txt(a.para_id, 64)).filter((id) => id && id !== yo.id))];
      if (!paraIds.length) return reply(req, 200, { enviados: 0, fallidos: 0 });
      const { data: subs } = await admin.from("push_subs").select("id,persona_id,endpoint,p256dh,auth,fallos").in("persona_id", paraIds);
      let enviados = 0, fallidos = 0;
      for (const s of subs ?? []) {
        const a = avisos.find((x) => txt(x.para_id, 64) === s.persona_id); if (!a) continue;
        const datos = { titulo: txt(a.titulo, 80) || "Casablanca", cuerpo: txt(a.cuerpo, 200), url: /^\/[#\w\-?=&]*$/.test(String(a.url || "")) ? String(a.url) : "/" };
        let st = 0; try { st = await enviarUno(s, datos); } catch { st = 0; }
        if (st >= 200 && st < 300) { enviados++; await admin.from("push_subs").update({ fallos: 0, ultimo_uso: new Date().toISOString() }).eq("id", s.id); }
        else {
          fallidos++;
          if (st === 404 || st === 410 || s.fallos + 1 >= 3) await admin.from("push_subs").delete().eq("id", s.id);
          else await admin.from("push_subs").update({ fallos: s.fallos + 1 }).eq("id", s.id);
        }
      }
      return reply(req, 200, { enviados, fallidos });
    }
    return reply(req, 400, { error: "acción desconocida: " + action });
  } catch (e) { return reply(req, 500, { error: (e as Error).message || String(e) }); }
});
