// ─────────────────────────────────────────────────────────────
// API /api/news — Devuelve las noticias en JSON
// La web hace fetch a este endpoint para mostrar el contenido
// ─────────────────────────────────────────────────────────────

const { getNews, getMeta } = require("../lib/storage");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const limit  = Math.min(parseInt(req.query.limit)  || 20, 60);
  const offset = parseInt(req.query.offset) || 0;

  try {
    const { articles, total } = await getNews({ limit, offset });
    const meta = await getMeta();

    return res.status(200).json({
      articles,
      total,
      limit,
      offset,
      lastUpdated: meta.lastRun,
      hasMore: offset + limit < total,
    });
  } catch (err) {
    console.error("[api/news] Error:", err.message);
    return res.status(500).json({ error: "Failed to fetch news" });
  }
};
