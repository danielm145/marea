// ============================================================================
// MAREA ALTA · Edge Function marea-admin-personas
// ----------------------------------------------------------------------------
// Crea y administra a los invitados usando auth.admin con la service_role que
// Supabase inyecta (SUPABASE_SERVICE_ROLE_KEY). Jamás viaja al navegador.
//
// Identidad: email sintético <cedula>@marea.local. La persona escribe su cédula
// y un PIN de 4 dígitos; la contraseña REAL en Auth es `${cedula}#${pin}`
// (así cumplimos el mínimo de longitud de Auth sin pedirle 6 dígitos a nadie).
// El front compone exactamente esa cadena al hacer login. El PIN NO se guarda
// en ninguna tabla: se devuelve UNA vez al crear/resetear, junto con el texto
// listo para WhatsApp.
//
// Seguridad: toda petición trae el JWT de un usuario cuya fila en `personas`
// tenga rol='admin' y activo. Si no, 403.
//
// Acciones (POST JSON {action, ...}):
//   listar     → personas (todas las columnas) + ultimo_acceso
//   crear      → {cedula, nombre, apodo?, telefono?, rol?}  → {persona, pin, mensaje, wa_url}
//   reset_pin  → {id}                                        → {pin, mensaje, wa_url}
//   toggle     → {id, activo}
//   actualizar → {id, campos:{nombre, apodo, telefono, rol, emergencia}}
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP = Deno.env.get("MAREA_APP_ORIGIN") ?? "https://marea.fieldbuil.ai";
const admin = createClient(URL, SRK, { auth: { persistSession: false, autoRefreshToken: false }, db: { schema: "marea" } });  // proyecto compartido fieldbuilt-lab → esquema propio

const ORIGENES = new Set([APP, "https://marea.daniel-martinez9094.workers.dev", "http://localhost:8787", "http://localhost:3000"]);
function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGENES.has(o) ? o : APP,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const reply = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" } });

const CEDULA_RE = /^[0-9]{6,12}$/;
const TRIVIALES = new Set(["0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999", "1234", "4321", "0123", "2580"]);

function pinNuevo(): string {
  for (;;) {
    const n = crypto.getRandomValues(new Uint32Array(1))[0] % 10000;
    const p = String(n).padStart(4, "0");
    if (!TRIVIALES.has(p)) return p;
  }
}
export const emailDe = (cedula: string) => `${cedula}@marea.local`;
export const passwordDe = (cedula: string, pin: string) => `${cedula}#${pin}`;

async function mensajeWA(nombre: string, pin: string) {
  const primer = (nombre || "").trim().split(/\s+/)[0] || "";
  const { data: cfg } = await admin.from("config").select("valor").eq("clave", "viaje").maybeSingle();
  const lugar = (cfg?.valor as Record<string, string>)?.lugar || "la playa";
  return `¡Hola ${primer}! 🌊🌙\nYa está lista MAREA ALTA, la app de nuestro viaje a ${lugar}.\n\n` +
    `👉 Entra desde tu celular: ${APP}\n🪪 Usuario: tu número de cédula\n🔑 Tu clave: ${pin.split("").join(" ")}\n\n` +
    `Ahí vas a encontrar:\n💸 Los gastos y cuánto te toca pagar, cada uno con su factura\n🗓️ El itinerario y las noches temáticas con su dress code\n` +
    `🍽️ El menú de cada día (márcanos si no comes algo)\n📸 El álbum para subir las fotos del viaje\n🙋 Tu ficha: alergias, tu talento y tu canción de karaoke\n\n` +
    `Tip: ábrela y en el menú del navegador elige "Agregar a pantalla de inicio" para tenerla como app.\nLa clave es solo tuya, no la compartas.`;
}
function waUrl(telefono: string | null, mensaje: string) {
  const tel = (telefono || "").replace(/\D/g, "");
  return tel ? `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}` : null;
}

async function audit(actor: string, accion: string, objetivo: string, detalle: unknown) {
  try { await admin.from("admin_audit").insert({ actor, accion, objetivo, detalle }); } catch (_) { /* opcional */ }
}

async function ultimosAccesos(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of data?.users ?? []) if (u.last_sign_in_at) map[u.id] = u.last_sign_in_at;
  return map;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "POST" });

  // --- quién llama ---
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return reply(req, 401, { error: "sin token" });
  const { data: caller } = await admin.auth.getUser(token);
  if (!caller?.user) return reply(req, 401, { error: "token inválido" });
  const { data: yo } = await admin.from("personas").select("id,nombre,rol,activo").eq("auth_id", caller.user.id).maybeSingle();
  if (!yo || !yo.activo || yo.rol !== "admin") return reply(req, 403, { error: "solo admin" });
  const actor = yo.nombre;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return reply(req, 400, { error: "JSON inválido" }); }
  const action = String(body.action || "");

  try {
    if (action === "listar") {
      const [{ data: personas, error }, acc] = await Promise.all([
        admin.from("personas").select("*").order("nombre"), ultimosAccesos(),
      ]);
      if (error) throw error;
      const { data: aud } = await admin.from("admin_audit").select("objetivo,ts").in("accion", ["crear", "reset_pin"]).order("ts", { ascending: false }).limit(2000);
      const inv: Record<string, string> = {};
      for (const x of aud ?? []) if (x.objetivo && !inv[x.objetivo]) inv[x.objetivo] = x.ts;
      return reply(req, 200, { personas: (personas ?? []).map((p) => ({ ...p, ultimo_acceso: p.auth_id ? acc[p.auth_id] ?? null : null, invitado_en: inv[p.cedula] ?? null })) });
    }

    if (action === "crear") {
      const cedula = String(body.cedula || "").replace(/\D/g, "");
      const nombre = String(body.nombre || "").trim();
      const apodo = String(body.apodo || "").trim() || null;
      const telefono = String(body.telefono || "").replace(/[^\d+]/g, "") || null;
      const rol = body.rol === "admin" ? "admin" : "invitado";
      if (!CEDULA_RE.test(cedula)) return reply(req, 400, { error: "cédula inválida (6 a 12 dígitos)" });
      if (nombre.length < 2) return reply(req, 400, { error: "nombre requerido" });
      const { data: existe } = await admin.from("personas").select("id").eq("cedula", cedula).maybeSingle();
      if (existe) return reply(req, 409, { error: "esa cédula ya está registrada" });

      const pin = pinNuevo();
      const { data: au, error: ea } = await admin.auth.admin.createUser({
        email: emailDe(cedula), password: passwordDe(cedula, pin), email_confirm: true,
        user_metadata: { nombre, cedula },
      });
      if (ea) throw ea;
      const { data: persona, error: ep } = await admin.from("personas")
        .insert({ auth_id: au.user.id, cedula, nombre, apodo, telefono, rol }).select().single();
      if (ep) { await admin.auth.admin.deleteUser(au.user.id); throw ep; }
      await audit(actor, "crear", cedula, { nombre, rol });
      const mensaje = await mensajeWA(nombre, pin);
      return reply(req, 200, { persona, pin, mensaje, wa_url: waUrl(telefono, mensaje) });
    }

    if (action === "reset_pin") {
      const { data: p } = await admin.from("personas").select("id,auth_id,cedula,nombre,telefono").eq("id", String(body.id)).maybeSingle();
      if (!p?.auth_id) return reply(req, 404, { error: "persona sin cuenta" });
      const pin = pinNuevo();
      const { error } = await admin.auth.admin.updateUserById(p.auth_id, { password: passwordDe(p.cedula, pin) });
      if (error) throw error;
      await audit(actor, "reset_pin", p.cedula, null);
      const mensaje = await mensajeWA(p.nombre, pin);
      return reply(req, 200, { pin, mensaje, wa_url: waUrl(p.telefono, mensaje) });
    }

    if (action === "toggle") {
      const activo = !!body.activo;
      const { data: p, error } = await admin.from("personas").update({ activo }).eq("id", String(body.id)).select("id,auth_id,cedula").single();
      if (error) throw error;
      if (p.auth_id) await admin.auth.admin.updateUserById(p.auth_id, { ban_duration: activo ? "none" : "876000h" });
      await audit(actor, activo ? "activar" : "bloquear", p.cedula, null);
      return reply(req, 200, { ok: true });
    }

    if (action === "actualizar") {
      const c = (body.campos ?? {}) as Record<string, unknown>;
      const campos: Record<string, unknown> = {};
      if (typeof c.nombre === "string" && c.nombre.trim()) campos.nombre = c.nombre.trim();
      if ("apodo" in c) campos.apodo = String(c.apodo ?? "").trim() || null;
      if ("telefono" in c) campos.telefono = String(c.telefono ?? "").replace(/[^\d+]/g, "") || null;
      if (c.rol === "admin" || c.rol === "invitado") campos.rol = c.rol;
      if ("emergencia" in c) campos.emergencia = c.emergencia ?? null;
      const { data: p, error } = await admin.from("personas").update(campos).eq("id", String(body.id)).select().single();
      if (error) throw error;
      await audit(actor, "actualizar", p.cedula, Object.keys(campos));
      return reply(req, 200, { persona: p });
    }

    return reply(req, 400, { error: "acción desconocida: " + action });
  } catch (e) {
    return reply(req, 500, { error: (e as Error).message || String(e) });
  }
});
