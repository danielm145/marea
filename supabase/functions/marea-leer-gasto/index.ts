// ============================================================================
// MAREA ALTA · marea-leer-gasto
// Texto libre y/o foto (factura, ticket de supermercado, captura de transferencia)
// → PROPUESTA estructurada de gastos, tareas y planes. Nunca guarda nada: el
// front la pinta en un formulario y la persona confirma.
// Entrada: { texto?, archivo_path? (bucket marea-respaldos), modo?: 'gasto'|'tareas'|'auto' }
// ============================================================================
import Anthropic from "npm:@anthropic-ai/sdk";
import { z } from "npm:zod";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk/helpers/zod";
import { admin, claude, MODELO, cors, reply, quienLlama } from "../_comun/base.ts";

const Factura = z.object({
  tipo_documento: z.enum(["factura", "ticket", "transferencia", "otro"]),
  comercio: z.string().nullable(),
  ruc: z.string().nullable(),
  numero: z.string().nullable(),         // 001-001-000012345
  clave_acceso: z.string().nullable(),   // 49 dígitos del SRI si se ve
  fecha: z.string().nullable(),
  items: z.array(z.object({ descripcion: z.string(), cantidad: z.number().nullable(), total: z.number().nullable() })),
  subtotal: z.number().nullable(), impuestos: z.number().nullable(), propina: z.number().nullable(), total: z.number().nullable(),
});
const Gasto = z.object({
  descripcion: z.string(), monto: z.number(), moneda: z.string(), fecha: z.string().nullable(),
  categoria: z.enum(["hospedaje", "despensa", "bebidas", "cocinera", "logistica", "restaurantes", "transporte", "actividades", "otros"]),
  alcance: z.enum(["fijo", "consumo"]),
  pagador_ids: z.array(z.string()), participante_ids: z.array(z.string()),
  modo: z.enum(["igual", "porcentaje", "monto"]),
  partes: z.array(z.object({ persona_id: z.string(), valor: z.number() })).nullable(),
  pago_entre: z.object({ de_id: z.string(), a_id: z.string() }).nullable(),
  evento_id: z.string().nullable(), factura: Factura.nullable(),
  etiquetas: z.array(z.string()),
  confianza: z.number(), dudas: z.array(z.string()),
});
const Tarea = z.object({
  titulo: z.string(), detalle: z.string().nullable(),
  grupo: z.enum(["Comida", "Bebidas", "Logística", "Casa", "Actividades", "Compras", "Turnos"]),
  prioridad: z.enum(["alta", "media", "baja"]),
  responsable_id: z.string().nullable(), fecha: z.string().nullable(), evento_id: z.string().nullable(),
  etiquetas: z.array(z.string()), subtareas: z.array(z.string()),
});
const Evento = z.object({
  titulo: z.string(), tematica: z.string().nullable(), descripcion: z.string().nullable(),
  dia: z.string().nullable(), bloque: z.enum(["manana", "tarde", "noche"]).nullable(),
  lugar: z.string().nullable(), dress_code: z.string().nullable(),
});
const Propuesta = z.object({ gastos: z.array(Gasto), tareas: z.array(Tarea), eventos: z.array(Evento), resumen: z.string() });

const SISTEMA = `Eres el asistente de "Marea Alta", la app de un viaje de amigos a Same, Esmeraldas (Ecuador).
Recibes un mensaje (texto y/o foto) y devuelves una PROPUESTA estructurada que una persona revisa antes de guardar.

Gastos y comprobantes:
1. NUNCA inventes un monto. Si no se lee, monto = 0, confianza < 0.3 y la duda en "dudas". Un vacío honesto vale más que un número inventado.
2. El TOTAL manda. IVA y propina van dentro del monto; además se detallan en "factura". Copia comercio, RUC (13 dígitos en Ecuador), fecha e ítems tal como se leen; si un dato no se ve, null.
3. Categorías: hospedaje (casa, anticipo), despensa (supermercado, víveres), bebidas (bar, hielo, licor), cocinera (sueldo o pagos a la cocinera), logistica (equipo, carbón, parlante, proyector), restaurantes (comer afuera), transporte, actividades (lancha, clases), otros.
4. alcance: "fijo" si es un costo de todo el grupo (casa, cocinera, despensa común); "consumo" si es de algunos.
5. Captura de transferencia entre dos personas del viaje: es un pago entre ellos. Llena pago_entre con sus ids; tipo_documento "transferencia".
6. Nombres → ids del contexto. "todos" = participante_ids vacío. "menos X" saca a X. Si un nombre es ambiguo (por ejemplo, dos personas con el mismo nombre de pila) NO adivines: déjalo fuera y dilo en dudas.
7. Quien escribe suele ser quien pagó: "pagué" → pagador_ids = [autor_id].
8. modo "igual" salvo que pidan porcentajes o montos por persona (que deben sumar 100 o el monto).
8b. Número de factura con el formato 001-001-000012345 y la clave de acceso de 49 dígitos si se ve.
8c. etiquetas: 2 o 3 palabras cortas en minúscula que ayuden a encontrar el gasto (ej. "hielo", "parrillada", "despensa").
8d. MEMORIA DEL GRUPO: si el comercio está en "comercios_conocidos" del contexto, usa su categoría, alcance y etiquetas salvo que el mensaje diga otra cosa.

Tareas (si el mensaje es una lista o un pendiente):
9. Una tarea por acción; si varias comparten verbo ("comprar hielo, carbón y…") repite el verbo en cada una. Subtareas solo si es un checklist claro.
10. prioridad alta si dice urgente, hoy, ya o antes de algo; baja si es opcional.
11. Asocia evento_id cuando mencione una noche o actividad del contexto (karaoke, asado/grill, pizza/juegos, tapas, talent, yoga…).

Responde en español neutro, descripciones cortas (máx. 60 caracteres), sin emojis.`;

async function imagenBase64(path: string) {
  const { data, error } = await admin.storage.from("marea-respaldos").download(path);
  if (error || !data) return null;
  const buf = new Uint8Array(await data.arrayBuffer());
  let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  const pdf = data.type === "application/pdf" || path.toLowerCase().endsWith(".pdf");
  return { data: btoa(bin), pdf, media_type: (data.type && data.type.startsWith("image/") ? data.type : "image/jpeg") as "image/jpeg" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "POST" });
  const t0 = Date.now();
  const yo = await quienLlama(req);
  if (!yo) return reply(req, 401, { error: "sin sesión" });
  let body: { texto?: string; archivo_path?: string; modo?: string } = {};
  try { body = await req.json(); } catch { return reply(req, 400, { error: "JSON inválido" }); }
  const texto = (body.texto || "").trim();
  if (!texto && !body.archivo_path) return reply(req, 400, { error: "manda texto o foto" });

  const [{ data: personas }, { data: eventos }, { data: cfg }, { data: comercios }] = await Promise.all([
    admin.from("personas_publicas").select("id,nombre,apodo").eq("activo", true),
    admin.from("eventos").select("id,titulo,tematica,dia").neq("estado", "cancelado"),
    admin.from("config").select("valor").eq("clave", "viaje").maybeSingle(),
    admin.from("comercios").select("nombre,ruc,categoria,alcance,etiquetas,veces").order("veces", { ascending: false }).limit(60),
  ]);
  const contexto = { autor_id: yo.id, autor: yo.apodo || yo.nombre, moneda: (cfg?.valor as Record<string, string>)?.moneda || "USD",
    hoy: new Date().toISOString().slice(0, 10), modo: body.modo || "auto", personas: personas ?? [], eventos: eventos ?? [], comercios_conocidos: comercios ?? [] };

  const content: Anthropic.ContentBlockParam[] = [];
  if (body.archivo_path) {
    if (!body.archivo_path.startsWith(yo.id + "/")) return reply(req, 403, { error: "ruta ajena" });
    const img = await imagenBase64(body.archivo_path);
    if (!img) return reply(req, 404, { error: "no encuentro la foto" });
    content.push(img.pdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: img.data } }
      : { type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } });
  }
  const pista = contexto.modo === "tareas" ? "\nEl usuario indicó que es una LISTA DE TAREAS." : contexto.modo === "gasto" ? "\nEl usuario indicó que es un GASTO o comprobante." : "";
  content.push({ type: "text", text: `CONTEXTO:\n${JSON.stringify(contexto)}${pista}\n\nMENSAJE DE ${contexto.autor}:\n${texto || "(solo la foto)"}` });

  try {
    const res = await claude.messages.parse({
      model: MODELO, max_tokens: 8000, system: SISTEMA,
      messages: [{ role: "user", content }],
      output_config: { effort: "medium", format: zodOutputFormat(Propuesta) },
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) return reply(req, 200, { error: "no_leible", detalle: res.stop_reason, ms: Date.now() - t0 });
    await admin.from("entradas").insert({ persona_id: yo.id, texto: texto || null, archivo_path: body.archivo_path || null, propuesta: res.parsed_output });
    return reply(req, 200, { propuesta: res.parsed_output, modelo: MODELO, ms: Date.now() - t0 });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return reply(req, err.status === 429 ? 429 : 500, { error: err.message || String(e) });
  }
});
