// Piezas compartidas de las Edge Functions de Marea Alta (proyecto fieldbuilt-lab, esquema marea).
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

export const URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
export const APP = Deno.env.get("MAREA_APP_ORIGIN") ?? "https://casablanca.fieldbuil.ai";
export const MODELO = "claude-opus-5-5";
export const admin = createClient(URL, SRK, { auth: { persistSession: false, autoRefreshToken: false }, db: { schema: "marea" } });
export const claude = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

const ORIGENES = new Set([APP, "https://casablanca.fieldbuil.ai", "https://marea.fieldbuil.ai", "https://marea.daniel-martinez9094.workers.dev", "http://localhost:8787", "http://localhost:3000"]);
export function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGENES.has(o) ? o : APP,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
export const reply = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" } });

/** Persona activa dueña del JWT, o null. */
export async function quienLlama(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  if (!data?.user) return null;
  const { data: yo } = await admin.from("personas").select("id,nombre,apodo,rol,activo").eq("auth_id", data.user.id).maybeSingle();
  return yo?.activo ? yo : null;
}
