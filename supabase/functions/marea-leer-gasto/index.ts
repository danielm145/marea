// ============================================================================
// MAREA ALTA · Edge Function marea-leer-gasto
// ----------------------------------------------------------------------------
// Recibe texto libre y/o la ruta de una foto (bucket privado `marea-respaldos`) y
// devuelve una PROPUESTA estructurada de gastos / tareas / eventos usando
// Claude Opus 5.5 con salida estructurada. La propuesta NUNCA se guarda aquí:
// el front la pinta en un formulario y la persona confirma.
//
// Entrada (POST JSON, con el JWT del usuario en Authorization):
//   { texto?: string, archivo_path?: string, media_type?: string }
// Salida: { propuesta: {gastos:[], tareas:[], eventos:[]}, modelo, ms }
//         o { error: 'no_leible' | ... }
//
// Reglas del modelo (ver SISTEMA): jamás inventa un monto; si no lo lee, monto=0
// y lo dice en `dudas` con confianza baja. Los nombres se mapean a ids reales.
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";
import { z } from "npm:zod";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk/helpers/zod";

const URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP = Deno.env.get("MAREA_APP_ORIGIN") ?? "https://marea.fieldbuil.ai";
const MODELO = "claude-opus-5-5";
const admin = createClient(URL, SRK, { auth: { persistSession: false, autoRefreshToken: false }, db: { schema: "marea" } });  // proyecto compartido fieldbuilt-lab → esquema propio
const claude = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

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

const Gasto = z.object({
  descripcion: z.string(),
  monto: z.number(),
  moneda: z.string(),
  fecha: z.string().nullable(),                 // YYYY-MM-DD o null
  categoria: z.enum(["comida", "bebidas", "hospedaje", "transporte", "actividades", "mercado", "otros"]),
  pagador_ids: z.array(z.string()),             // ids de personas; vacío si no se sabe
  participante_ids: z.array(z.string()),        // ids; vacío = todos
  modo: z.enum(["igual", "porcentaje", "monto"]),
  partes: z.array(z.object({ persona_id: z.string(), valor: z.number() })).nullable(),
  evento_id: z.string().nullable(),
  etiquetas: z.array(z.string()),
  confianza: z.number(),                        // 0..1
  dudas: z.array(z.string()),
});
const Tarea = z.object({
  titulo: z.string(), detalle: z.string().nullable(),
  grupo: z.enum(["Comida", "Bebidas", "Logística", "Casa", "Actividades", "Compras", "Turnos"]),
  responsable_id: z.string().nullable(), fecha: z.string().nullable(), evento_id: z.string().nullable(),
  etiquetas: z.array(z.string()), subtareas: z.array(z.string()),
});
const Evento = z.object({
  titulo: z.string(), tematica: z.string().nullable(), descripcion: z.string().nullable(),
  dia: z.string().nullable(), bloque: z.enum(["manana", "tarde", "noche"]).nullable(),
  lugar: z.string().nullable(), dress_code: z.string().nullable(),
});
const Propuesta = z.object({ gastos: z.array(Gasto), tareas: z.array(Tarea), eventos: z.array(Evento), resumen: z.string() });

const SISTEMA = `Eres el asistente de "Marea Alta", la app de un viaje a la playa entre amigos.
Recibes un mensaje (texto y/o la foto de una factura o una lista) y devuelves una PROPUESTA
estructurada que una persona va a revisar antes de guardar. Reglas:
1. NUNCA inventes un monto. Si la foto no se lee o el texto no lo dice, monto = 0, confianza < 0.3
   y la duda explícita en "dudas". Un vacío honesto vale más que un número inventado.
2. El TOTAL de la factura manda. Propina e impuestos van dentro del monto, no aparte. Si hay varias
   facturas en una foto, un gasto por factura.
3. Mapea nombres a los ids del contexto. "todos" = participante_ids vacío. "menos X" / "sin X" saca
   a X. Si un nombre es ambiguo (hay tres Natalias), NO adivines: déjalo fuera y ponlo en dudas.
4. Quien escribe suele ser quien pagó: si el texto dice "pagué", pagador_ids = [autor_id].
5. modo "igual" salvo que el texto pida porcentajes o montos por persona. Si pide "monto", las
   partes deben sumar el monto; si "porcentaje", deben sumar 100.
6. La fecha de la factura si se ve; si no, null. Moneda: la del contexto salvo que la factura diga otra.
7. Si el mensaje es una lista de cosas por hacer o por comprar, son TAREAS, no gastos. Si describe
   una actividad o una noche temática, es un EVENTO. Puede haber de los tres en un mismo mensaje.
8. Responde en español neutro, descripciones cortas (máx. 60 caracteres), sin emojis.`;

async function imagenBase64(path: string): Promise<{ data: string; media_type: string } | null> {
  const { data, error } = await admin.storage.from("marea-respaldos").download(path);
  if (error || !data) return null;
  const buf = new Uint8Array(await data.arrayBuffer());
  let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  const mt = data.type && data.type.startsWith("image/") ? data.type : "image/jpeg";
  return { data: btoa(bin), media_type: mt };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "POST" });
  const t0 = Date.now();

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: caller } = token ? await admin.auth.getUser(token) : { data: null };
  if (!caller?.user) return reply(req, 401, { error: "sin sesión" });
  const { data: yo } = await admin.from("personas").select("id,nombre,apodo,activo").eq("auth_id", caller.user.id).maybeSingle();
  if (!yo?.activo) return reply(req, 403, { error: "cuenta inactiva" });

  let body: { texto?: string; archivo_path?: string } = {};
  try { body = await req.json(); } catch { return reply(req, 400, { error: "JSON inválido" }); }
  const texto = (body.texto || "").trim();
  if (!texto && !body.archivo_path) return reply(req, 400, { error: "manda texto o foto" });

  // contexto real: personas, eventos, moneda — el modelo mapea contra esto
  const [{ data: personas }, { data: eventos }, { data: cfg }] = await Promise.all([
    admin.from("personas_publicas").select("id,nombre,apodo").eq("activo", true),
    admin.from("eventos").select("id,titulo,dia").neq("estado", "cancelado"),
    admin.from("config").select("valor").eq("clave", "viaje").maybeSingle(),
  ]);
  const contexto = {
    autor_id: yo.id, autor: yo.apodo || yo.nombre,
    moneda: (cfg?.valor as Record<string, string>)?.moneda || "USD",
    hoy: new Date().toISOString().slice(0, 10),
    personas: personas ?? [], eventos: eventos ?? [],
  };

  const content: Anthropic.ContentBlockParam[] = [];
  if (body.archivo_path) {
    // solo se permite leer dentro de la carpeta del autor
    if (!body.archivo_path.startsWith(yo.id + "/")) return reply(req, 403, { error: "ruta ajena" });
    const img = await imagenBase64(body.archivo_path);
    if (!img) return reply(req, 404, { error: "no encuentro la foto" });
    content.push({ type: "image", source: { type: "base64", media_type: img.media_type as "image/jpeg", data: img.data } });
  }
  content.push({ type: "text", text: `CONTEXTO:\n${JSON.stringify(contexto)}\n\nMENSAJE DE ${contexto.autor}:\n${texto || "(solo la foto)"}` });

  try {
    const res = await claude.messages.parse({
      model: MODELO,
      max_tokens: 8000,
      system: SISTEMA,
      messages: [{ role: "user", content }],
      output_config: { effort: "medium", format: zodOutputFormat(Propuesta) },
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) {
      return reply(req, 200, { error: "no_leible", detalle: res.stop_reason, ms: Date.now() - t0 });
    }
    // rastro de lo que la persona mandó (se marca confirmada/descartada desde el front)
    await admin.from("entradas").insert({ persona_id: yo.id, texto: texto || null, archivo_path: body.archivo_path || null, propuesta: res.parsed_output });
    return reply(req, 200, { propuesta: res.parsed_output, modelo: MODELO, ms: Date.now() - t0 });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return reply(req, err.status === 429 ? 429 : 500, { error: err.message || String(e) });
  }
});
