#!/usr/bin/env node
// Escribe public/img/generadas.js: la lista de fotos opcionales que SÍ existen (img/playa, img/eventos, img/gente).
// La app solo pide esas: una foto que falta en Cloudflare devuelve la app entera (~440 KB) en vez de un 404.
// La corren solos generar-imagenes.mjs y quien agregue caras; también: node scripts/listar-fotos.mjs
import fs from "node:fs";
import path from "node:path";
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const lista = [];
for (const d of ["playa", "eventos", "gente"]) {
  let fs_ = []; try { fs_ = fs.readdirSync(path.join(RAIZ, "public/img", d)); } catch { continue; }
  for (const f of fs_.sort()) if (/\.(jpe?g|png|webp)$/i.test(f)) lista.push(`img/${d}/${f}`);
}
fs.writeFileSync(path.join(RAIZ, "public/img/generadas.js"),
  "/* generado por scripts/listar-fotos.mjs — no editar a mano */\nwindow.FOTOS_GEN=" + JSON.stringify(lista, null, 0) + ";\n");
console.log(`img/generadas.js: ${lista.length} foto(s) opcionales (${["eventos", "gente", "playa"].map((d) => d + " " + lista.filter((x) => x.startsWith("img/" + d)).length).join(" · ")})`);
