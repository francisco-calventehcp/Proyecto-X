#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// SEED — Carga inicial de contenido
// Ejecutar UNA SOLA VEZ después del primer deploy:
//   vercel env pull .env.local
//   npm run seed
// ─────────────────────────────────────────────────────────────

require("dotenv").config({ path: ".env.local" });

const { scrapeAllSources } = require("../lib/scraper");
const { rewriteBatch }     = require("../lib/rewriter");
const { saveNews }         = require("../lib/storage");

async function seed() {
  console.log("\n🏗️  Built Digest — Cargando contenido inicial...\n");

  if (!process.env.GROQ_API_KEY) {
    console.error("❌  GROQ_API_KEY no definida.");
    console.error("    Crea un archivo .env.local con tu key de https://console.groq.com\n");
    process.exit(1);
  }

  if (!process.env.KV_REST_API_URL) {
    console.error("❌  Variables de Vercel KV no encontradas.");
    console.error("    Ejecuta primero: vercel env pull .env.local\n");
    process.exit(1);
  }

  // 1. Scraping
  console.log("📡 Scrapeando fuentes...");
  const raw = await scrapeAllSources();
  console.log(`   ✓ ${raw.length} artículos encontrados\n`);

  if (raw.length === 0) {
    console.error("❌  Sin artículos. Revisa la conexión a internet.\n");
    process.exit(1);
  }

  // 2. Reescritura
  console.log("✍️  Reescribiendo con IA (Groq Llama 3)...");
  const rewritten = await rewriteBatch(raw, 8);
  console.log(`   ✓ ${rewritten.length} artículos reescritos\n`);

  // 3. Guardar
  console.log("💾 Guardando en Vercel KV...");
  const result = await saveNews(rewritten);
  console.log(`   ✓ ${result.added} artículos guardados (${result.total} en total)\n`);

  console.log("🎉 ¡Seed completo! Tu web ya tiene contenido.\n");
}

seed().catch((err) => {
  console.error("❌  Seed fallido:", err.message);
  process.exit(1);
});
