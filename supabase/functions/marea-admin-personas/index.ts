// ============================================================================
// CASABLANCA · SAME · Edge Function marea-admin-personas
// ----------------------------------------------------------------------------
// Crea y administra a los invitados usando auth.admin con la service_role que
// Supabase inyecta (SUPABASE_SERVICE_ROLE_KEY). Jamás viaja al navegador.
//
// Desde el 7-oct-2026 se entra SOLO con el celular (acción pública «entrar»: devuelve la sesión).
// Antes (se conserva para las cuentas viejas): se entraba con el CELULAR y una clave de 4
// dígitos que es el día y el mes del cumpleaños (DDMM). Email sintético
// <celular>@marea.local y contraseña REAL en Auth `${celular}#${DDMM}`; el
// front compone exactamente esa cadena. El celular se guarda en formato
// internacional sin '+' (593985576470). El cumpleaños se guarda 'MM-DD'.
//
// Seguridad: toda petición trae el JWT de un usuario cuya fila en `personas`
// tenga rol='admin' y activo. Si no, 403.
//
// Acciones (POST JSON {action, ...}):
//   listar     → personas (todas las columnas) + ultimo_acceso
//   crear      → {telefono, cumple, nombre, apodo?, rol?}   → {persona, pin, mensaje, wa_url}
//   reset_pin  → {id}  (reenviar: deja la clave igual al cumpleaños) → {pin, mensaje, wa_url}
//   toggle     → {id, activo}
//   actualizar → {id, campos:{nombre, apodo, telefono, cumple, rol, emergencia}}
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP = Deno.env.get("MAREA_APP_ORIGIN") ?? "https://casablanca.fieldbuil.ai";
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

/* celular → formato internacional sin '+'. Ecuador 09xxxxxxxx → 5939xxxxxxxx; Colombia 3xxxxxxxxx → 573xxxxxxxxx */
export function normTel(t: unknown): string | null {
  let d = String(t ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("0")) d = "593" + d.slice(1);
  else if (d.length === 9 && d.startsWith("9")) d = "593" + d;
  else if (d.length === 10 && d.startsWith("3")) d = "57" + d;
  return /^[0-9]{11,15}$/.test(d) ? d : null;
}
/* cumpleaños → 'MM-DD'. Acepta 07/03, 7-3, 0703, 1990-03-07 */
export function normCumple(c: unknown): string | null {
  const t = String(c ?? "").trim();
  let dd: number, mm: number, m: RegExpMatchArray | null;
  if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) { mm = +m[2]; dd = +m[3]; }
  else if ((m = t.match(/^(\d{1,2})[\/\-. ](\d{1,2})/))) { dd = +m[1]; mm = +m[2]; }
  else if ((m = t.match(/^(\d{2})(\d{2})$/))) { dd = +m[1]; mm = +m[2]; }
  else return null;
  const max = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mm - 1];
  if (!max || dd < 1 || dd > max) return null;
  return String(mm).padStart(2, "0") + "-" + String(dd).padStart(2, "0");
}
export const pinDe = (cumple: string) => cumple.slice(3, 5) + cumple.slice(0, 2);   // MM-DD → DDMM
export const emailDe = (tel: string) => `${tel}@marea.local`;
export const passwordDe = (tel: string, pin: string) => `${tel}#${pin}`;
/* desde el 7-oct se entra solo con el celular: la contraseña de Auth ya no la escribe nadie */
const claveDe = (tel: string, cumple: string | null) => cumple ? passwordDe(tel, pinDe(cumple)) : `${tel}#${crypto.randomUUID()}`;

async function mensajeWA(nombre: string) {
  const primer = (nombre || "").trim().split(/\s+/)[0] || "";
  const { data: cfg } = await admin.from("config").select("valor").eq("clave", "viaje").maybeSingle();
  const v = (cfg?.valor as Record<string, string>) || {};
  const lugar = v.lugar || "la playa", app = v.nombre || "Casablanca";
  return `¡Hola ${primer}! 🌴☀️\nYa está lista ${app}, la app de nuestro viaje a ${lugar}.\n\n` +
    `👉 Entra desde tu celular: ${APP}\n📱 Entras solo con tu número de celular, sin clave\n\n` +
    `Ahí vas a encontrar:\n💸 Los gastos y cuánto te toca pagar, cada uno con su factura\n🗓️ El plan de cada día y el look de cada noche\n` +
    `🍽️ El menú de los 4 días (márcanos si no comes algo)\n📸 El álbum para subir las fotos del viaje\n🙋 Tu ficha: alergias, tu talento y tu canción de karaoke\n\n` +
    `Tip: ábrela y en el menú del navegador elige "Agregar a pantalla de inicio" para tenerla como app.`;
}
function waUrl(telefono: string | null, mensaje: string) {
  const tel = (telefono || "").replace(/\D/g, "");
  return tel ? `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}` : null;
}

// alguien que ya estaba en la lista (sembrado o creado sin cuenta) recibe su cuenta apenas tenga celular y cumpleaños
async function asegurarCuenta(p: { id: string; auth_id: string | null; telefono: string | null; cumple: string | null; nombre: string }) {
  if (p.auth_id || !p.telefono) return p.auth_id;
  const email = emailDe(p.telefono), password = claveDe(p.telefono, p.cumple);
  let uid: string | null = null;
  const { data: au, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nombre: p.nombre } });
  if (!error) uid = au.user.id;
  else {   // la cuenta ya existía con ese correo: se busca y se le deja la clave = cumpleaños
    for (let page = 1; page <= 20 && !uid; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const u = data?.users?.find((x) => x.email === email); if (u) uid = u.id;
      if (!data?.users?.length || data.users.length < 200) break;
    }
    if (!uid) throw error;
    const { error: eu } = await admin.auth.admin.updateUserById(uid, { password, email_confirm: true }); if (eu) throw eu;
  }
  const { error: ep } = await admin.from("personas").update({ auth_id: uid }).eq("id", p.id); if (ep) throw ep;
  return uid;
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

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return reply(req, 400, { error: "JSON inválido" }); }
  const action = String(body.action || "");

  // --- ENTRAR SOLO CON EL CELULAR (Daniel, 7-oct-2026: «para no enredarnos») ---
  // Público: si el celular está en la lista y activo, se le da la sesión. No hay clave.
  if (action === "entrar") {
    try {
      const tel = normTel(body.telefono);
      if (!tel) return reply(req, 400, { error: "Escribe tu número de celular completo (ej. 098 557 6470)." });
      const { data: p } = await admin.from("personas").select("id,auth_id,nombre,telefono,cumple,activo").eq("telefono", tel).maybeSingle();
      if (!p) return reply(req, 404, { error: "Ese celular no está en la lista del viaje. Escríbele a Daniel." });
      if (!p.activo) return reply(req, 403, { error: "Tu cuenta está bloqueada. Escríbele a Daniel." });
      await asegurarCuenta(p);
      const { data: link, error: el } = await admin.auth.admin.generateLink({ type: "magiclink", email: emailDe(tel) });
      if (el || !link?.properties?.hashed_token) throw el || new Error("no pude abrir la sesión");
      const pub = createClient(URL, Deno.env.get("SUPABASE_ANON_KEY") ?? SRK, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: ses, error: ev } = await pub.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
      if (ev || !ses?.session) throw ev || new Error("no pude abrir la sesión");
      return reply(req, 200, { access_token: ses.session.access_token, refresh_token: ses.session.refresh_token });
    } catch (e) { return reply(req, 500, { error: (e as Error).message || String(e) }); }
  }

  // --- quién llama ---
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return reply(req, 401, { error: "sin token" });
  const { data: caller } = await admin.auth.getUser(token);
  if (!caller?.user) return reply(req, 401, { error: "token inválido" });
  const { data: yo } = await admin.from("personas").select("id,nombre,rol,activo").eq("auth_id", caller.user.id).maybeSingle();
  if (!yo || !yo.activo || yo.rol !== "admin") return reply(req, 403, { error: "solo admin" });
  const actor = yo.nombre;

  try {
    if (action === "listar") {
      const [{ data: personas, error }, acc] = await Promise.all([
        admin.from("personas").select("*").order("nombre"), ultimosAccesos(),
      ]);
      if (error) throw error;
      const { data: aud } = await admin.from("admin_audit").select("objetivo,ts").in("accion", ["crear", "reset_pin"]).order("ts", { ascending: false }).limit(2000);
      const inv: Record<string, string> = {};
      for (const x of aud ?? []) if (x.objetivo && !inv[x.objetivo]) inv[x.objetivo] = x.ts;
      return reply(req, 200, { personas: (personas ?? []).map((p) => ({ ...p, ultimo_acceso: p.auth_id ? acc[p.auth_id] ?? null : null, invitado_en: inv[p.id] ?? inv[p.telefono] ?? inv[p.cedula] ?? null })) });
    }

    if (action === "crear") {
      const telefono = normTel(body.telefono);
      const cumple = normCumple(body.cumple);
      const nombre = String(body.nombre || "").trim();
      const apodo = String(body.apodo || "").trim() || null;
      const rol = body.rol === "admin" ? "admin" : "invitado";
      if (!telefono) return reply(req, 400, { error: "celular inválido (ej. 0985576470 o +593 98 557 6470)" });
      if (body.cumple && String(body.cumple).trim() && !cumple) return reply(req, 400, { error: "cumpleaños inválido (día y mes, ej. 1806)" });
      if (nombre.length < 2) return reply(req, 400, { error: "nombre requerido" });
      const { data: existe } = await admin.from("personas").select("id").eq("telefono", telefono).maybeSingle();
      if (existe) return reply(req, 409, { error: "ese celular ya está registrado" });

      const pin = cumple ? pinDe(cumple) : null;
      const { data: au, error: ea } = await admin.auth.admin.createUser({
        email: emailDe(telefono), password: claveDe(telefono, cumple), email_confirm: true,
        user_metadata: { nombre },
      });
      if (ea) throw ea;
      const { data: persona, error: ep } = await admin.from("personas")
        .insert({ auth_id: au.user.id, telefono, cumple, nombre, apodo, rol }).select().single();
      if (ep) { await admin.auth.admin.deleteUser(au.user.id); throw ep; }
      await audit(actor, "crear", persona.id, { nombre, rol });
      const mensaje = await mensajeWA(nombre);
      return reply(req, 200, { persona, pin, mensaje, wa_url: waUrl(telefono, mensaje) });
    }

    if (action === "reset_pin") {   // «reenviar invitación»: la clave sigue siendo el cumpleaños; se re-sincroniza por si acaso
      const { data: p } = await admin.from("personas").select("id,auth_id,nombre,telefono,cumple").eq("id", String(body.id)).maybeSingle();
      if (!p) return reply(req, 404, { error: "no encontré a esa persona" });
      if (!p.telefono) return reply(req, 400, { error: "falta el celular: ponlo y guarda primero" });
      p.auth_id = await asegurarCuenta(p);
      const pin = p.cumple ? pinDe(p.cumple) : null;
      await audit(actor, "reset_pin", p.id, null);
      const mensaje = await mensajeWA(p.nombre);
      return reply(req, 200, { pin, mensaje, wa_url: waUrl(p.telefono, mensaje) });
    }

    if (action === "toggle") {
      const activo = !!body.activo;
      const { data: p, error } = await admin.from("personas").update({ activo }).eq("id", String(body.id)).select("id,auth_id").single();
      if (error) throw error;
      if (p.auth_id) await admin.auth.admin.updateUserById(p.auth_id, { ban_duration: activo ? "none" : "876000h" });
      await audit(actor, activo ? "activar" : "bloquear", p.id, null);
      return reply(req, 200, { ok: true });
    }

    if (action === "actualizar") {
      const c = (body.campos ?? {}) as Record<string, unknown>;
      const campos: Record<string, unknown> = {};
      if (typeof c.nombre === "string" && c.nombre.trim()) campos.nombre = c.nombre.trim();
      if ("apodo" in c) campos.apodo = String(c.apodo ?? "").trim() || null;
      if ("telefono" in c) { const t = normTel(c.telefono); if (!t) return reply(req, 400, { error: "celular inválido" }); campos.telefono = t; }
      if ("cumple" in c) { const k = normCumple(c.cumple); if (!k) return reply(req, 400, { error: "cumpleaños inválido" }); campos.cumple = k; }
      if (campos.telefono) {
        const { data: otro } = await admin.from("personas").select("id").eq("telefono", campos.telefono).neq("id", String(body.id)).maybeSingle();
        if (otro) return reply(req, 409, { error: "ese celular ya es de otra persona" });
      }
      if (c.rol === "admin" || c.rol === "invitado") campos.rol = c.rol;
      if ("emergencia" in c) campos.emergencia = c.emergencia ?? null;
      const { data: p, error } = await admin.from("personas").update(campos).eq("id", String(body.id)).select().single();
      if (error) throw error;
      // el celular y el cumpleaños son el usuario y la clave: Auth tiene que ir igual
      if (!p.auth_id) p.auth_id = await asegurarCuenta(p);
      else if (campos.telefono && p.telefono) {   // cambió el celular = cambió el usuario
        const { error: eu } = await admin.auth.admin.updateUserById(p.auth_id, { email: emailDe(p.telefono), email_confirm: true });
        if (eu) throw eu;
      }
      await audit(actor, "actualizar", p.id, Object.keys(campos));
      return reply(req, 200, { persona: p });
    }

    return reply(req, 400, { error: "acción desconocida: " + action });
  } catch (e) {
    return reply(req, 500, { error: (e as Error).message || String(e) });
  }
});
