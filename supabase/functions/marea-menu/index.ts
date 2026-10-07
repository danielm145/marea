// ============================================================================
// MAREA ALTA · marea-menu
// Completa la ficha de un plato: descripción apetitosa, estilo, ingredientes,
// etiquetas y alérgenos (con el catálogo fijo que usa la app para las alertas).
// Entrada: { plato: { nombre, ingredientes[], descripcion?, estilo? } }  → { plato }
// No genera imágenes: la foto la sube el grupo desde la app.
// ============================================================================
import { z } from "npm:zod";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk/helpers/zod";
import { claude, MODELO, cors, reply, quienLlama } from "../_comun/base.ts";

const Plato = z.object({
  descripcion: z.string(), estilo: z.string(), ingredientes: z.array(z.string()),
  tags: z.array(z.enum(["#Healthy", "#Costeño", "#Tradicional", "#SinMariscos", "#ZeroAlcohol", "#Vegetariano", "#Compartir", "#Picante"])),
  alergenos: z.array(z.enum(["mariscos", "conchas", "oscuros", "pescado", "carne", "cerdo", "lacteos", "gluten", "huevo", "mani", "alcohol"])),
});
const SISTEMA = `Escribes la carta de comida de un viaje de amigos a Same, Esmeraldas (costa de Ecuador).
Para el plato que te dan devuelve:
- descripcion: 1 o 2 frases apetitosas y concretas (máx. 160 caracteres), sin exagerar ni inventar ingredientes raros.
- estilo: cómo se prepara, en pocas palabras (ej. "Esmeraldeño, en salsa de coco").
- ingredientes: los base del plato; si ya vienen, respétalos y completa solo lo obvio.
- tags: solo del catálogo. #Costeño para cocina de la costa ecuatoriana; #ZeroAlcohol para bebidas sin alcohol; #SinMariscos si no lleva mariscos ni conchas.
- alergenos: del catálogo. "conchas" y "oscuros" (mariscos oscuros) para conchas negras, mejillones, almejas y ostiones; "mariscos" para camarón, calamar, pulpo, langosta; "alcohol" solo si la bebida lo lleva.
Español neutro, sin emojis.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "POST" });
  if (!(await quienLlama(req))) return reply(req, 401, { error: "sin sesión" });
  let body: { plato?: { nombre?: string; ingredientes?: string[]; descripcion?: string; estilo?: string } } = {};
  try { body = await req.json(); } catch { return reply(req, 400, { error: "JSON inválido" }); }
  const p = body.plato;
  if (!p?.nombre) return reply(req, 400, { error: "falta el nombre del plato" });
  try {
    const res = await claude.messages.parse({
      model: MODELO, max_tokens: 2000, system: SISTEMA,
      messages: [{ role: "user", content: JSON.stringify(p) }],
      output_config: { effort: "low", format: zodOutputFormat(Plato) },
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) return reply(req, 200, { error: "sin_respuesta" });
    return reply(req, 200, { plato: res.parsed_output });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return reply(req, err.status === 429 ? 429 : 500, { error: err.message || String(e) });
  }
});
