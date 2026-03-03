// ─────────────────────────────────────────────────────────────
// API /api/scrape — Cron diario: scraping + IA + guardado
// Se ejecuta automáticamente cada día a las 7:00 AM (Vercel Cron)
// ─────────────────────────────────────────────────────────────

const { scrapeAllSources } = require("../lib/scraper");
const { rewriteBatch }     = require("../lib/rewriter");
const { saveNews, getMeta } = require("../lib/storage");

module.exports = async function handler(req, res) {

  // ── AUTENTICACIÓN ──────────────────────────────────────────
  const authHeader = req.headers["authorization"];
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    if (!req.headers["x-vercel-cron"]) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  // ── RATE LIMIT: mínimo 6h entre ejecuciones ───────────────
  const meta = await getMeta();
  if (meta.lastRun) {
    const hoursSince = (Date.now() - new Date(meta.lastRun).getTime()) / (1000 * 60 * 60);
    if (hoursSince < 6) {
      return res.status(200).json({
        status: "skipped",
        reason: `Último scrape hace ${hoursSince.toFixed(1)}h (mínimo 6h entre ejecuciones)`,
        lastRun: meta.lastRun,
      });
    }
  }

  const startTime = Date.now();
  console.log("[cron] Iniciando scrape diario...");

  try {
    // 1. Scraping de fuentes
    const rawArticles = await scrapeAllSources();
    console.log(`[cron] ${rawArticles.length} artículos scraped`);

    if (rawArticles.length === 0) {
      return res.status(200).json({ status: "no_content", message: "Sin artículos nuevos" });
    }

    // 2. Reescritura con IA (máx 8 para controlar uso de API)
    const rewritten = await rewriteBatch(rawArticles, 8);
    console.log(`[cron] ${rewritten.length} artículos reescritos`);

    if (rewritten.length === 0) {
      return res.status(500).json({
        status: "error",
        message: "Todos los rewrites fallaron — revisa GROQ_API_KEY",
      });
    }

    // 3. Guardar en Vercel KV
    const result = await saveNews(rewritten);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[cron] Completado en ${elapsed}s — ${result.added} nuevos artículos`);

    return res.status(200).json({
      status: "success",
      scraped:  rawArticles.length,
      rewritten: rewritten.length,
      saved:    result.added,
      total:    result.total,
      elapsed:  `${elapsed}s`,
    });

  } catch (err) {
    console.error("[cron] Error fatal:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};
