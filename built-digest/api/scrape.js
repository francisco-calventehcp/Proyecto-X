const { scrapeAllSources } = require("../lib/scraper");
const { rewriteBatch }     = require("../lib/rewriter");
const { saveNews, getMeta } = require("../lib/storage");

console.log("[scrape] Módulos cargados OK");

module.exports = async function handler(req, res) {

  const authHeader  = req.headers["authorization"];
  const querySecret = req.query.secret;
  const cronSecret  = process.env.CRON_SECRET;

  if (cronSecret) {
    const validHeader = authHeader === `Bearer ${cronSecret}`;
    const validQuery  = querySecret === cronSecret;
    const validCron   = !!req.headers["x-vercel-cron"];
    if (!validHeader && !validQuery && !validCron) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const force = req.query.force === "true";

  if (!force) {
    const meta = await getMeta();
    if (meta.lastRun) {
      const hoursSince = (Date.now() - new Date(meta.lastRun).getTime()) / (1000 * 60 * 60);
      if (hoursSince < 6) {
        return res.status(200).json({
          status: "skipped",
          reason: `Último scrape hace ${hoursSince.toFixed(1)}h`,
          lastRun: meta.lastRun,
          tip: "Añade &force=true para forzar",
        });
      }
    }
  }

  const startTime = Date.now();
  console.log("[scrape] Iniciando...");

  try {
    console.log("[scrape] Llamando scrapeAllSources...");
    const rawArticles = await scrapeAllSources();
    console.log(`[scrape] ${rawArticles.length} artículos obtenidos`);

    if (rawArticles.length === 0) {
      return res.status(200).json({ status: "no_content", message: "Sin artículos nuevos" });
    }

    console.log("[scrape] Llamando rewriteBatch...");
    const rewritten = await rewriteBatch(rawArticles, 8);
    console.log(`[scrape] ${rewritten.length} artículos reescritos`);

    if (rewritten.length === 0) {
      return res.status(500).json({ status: "error", message: "Rewrites fallaron — revisa GROQ_API_KEY" });
    }

    console.log("[scrape] Guardando en base de datos...");
    const result = await saveNews(rewritten);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    return res.status(200).json({
      status:    "success",
      scraped:   rawArticles.length,
      rewritten: rewritten.length,
      saved:     result.added,
      total:     result.total,
      elapsed:   `${elapsed}s`,
    });

  } catch (err) {
    console.error("[scrape] Error:", err.message);
    console.error("[scrape] Stack:", err.stack);
    return res.status(500).json({ status: "error", message: err.message });
  }
};
