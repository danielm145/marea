// ============================================================================
// MAREA ALTA · marea-info
// Convierte un texto pegado por el admin (mensaje del dueño de la casa, notas)
// en "Lo esencial": dirección, check-in/out, WiFi, qué llevar, reglas, contactos
// y preguntas frecuentes. Solo admin. No guarda: el admin revisa y guarda.
// ============================================================================
import { z } from "npm:zod";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk/helpers/zod";
import { claude, MODELO, cors, reply, quienLlama } from "../_comun/base.ts";

const Info = z.object({
  casa_titulo: z.string().nullable(), casa_desc: z.string().nullable(), airbnb_url: z.string().nullable(), amenidades: z.array(z.string()),
  direccion: z.string().nullable(), mapa_url: z.string().nullable(),
  checkin: z.string().nullable(), checkout: z.string().nullable(),
  wifi_red: z.string().nullable(), wifi_clave: z.string().nullable(),
  que_llevar: z.array(z.string()), reglas: z.array(z.string()),
  contactos: z.array(z.object({ nombre: z.string(), rol: z.string(), tel: z.string() })),
  faq: z.array(z.object({ p: z.string(), r: z.string() })),
});
const SISTEMA = `Extraes la información práctica de un viaje de amigos a Same, Esmeraldas, a partir de un texto pegado.
Copia los datos tal como aparecen (direcciones, horas, claves, teléfonos); si algo no está, null o lista vacía. No inventes.
mapa_url solo si el texto trae un link https de mapas; airbnb_url solo si trae un link https de airbnb.
casa_desc: la descripción de la casa en 2 a 4 frases; amenidades: comodidades cortas (Piscina, Frente al mar, Parrilla…). que_llevar y reglas: frases cortas, una por elemento.
faq: solo preguntas que el texto responde. Español neutro, sin emojis.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "POST" });
  const yo = await quienLlama(req);
  if (!yo || yo.rol !== "admin") return reply(req, 403, { error: "solo admin" });
  let body: { texto?: string } = {};
  try { body = await req.json(); } catch { return reply(req, 400, { error: "JSON inválido" }); }
  const texto = (body.texto || "").trim().slice(0, 20000);
  if (!texto) return reply(req, 400, { error: "falta el texto" });
  try {
    const res = await claude.messages.parse({
      model: MODELO, max_tokens: 4000, system: SISTEMA,
      messages: [{ role: "user", content: texto }],
      output_config: { effort: "low", format: zodOutputFormat(Info) },
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) return reply(req, 200, { error: "sin_respuesta" });
    return reply(req, 200, { info: res.parsed_output });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return reply(req, err.status === 429 ? 429 : 500, { error: err.message || String(e) });
  }
});
