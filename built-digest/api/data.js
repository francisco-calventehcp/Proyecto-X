// ─────────────────────────────────────────────────────────────
// API /api/data — Datos del mercado desde el INE
// Cache de 6 horas en servidor para no saturar el INE
// ─────────────────────────────────────────────────────────────

const { fetchAllIndicators } = require("../lib/data-fetcher");

let cache     = null;
let cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 horas

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");

  try {
    const now = Date.now();

    // Devolver cache si está fresca
    if (cache && now - cacheTime < CACHE_TTL) {
      return res.status(200).json({
        ...cache,
        cached: true,
        cacheAge: Math.round((now - cacheTime) / 1000 / 60) + " min",
      });
    }

    // Fetch fresco del INE
    console.log("[api/data] Obteniendo datos del INE...");
    const data = await fetchAllIndicators();
    cache     = data;
    cacheTime = now;

    return res.status(200).json({ ...data, cached: false });

  } catch (err) {
    console.error("[api/data] Error:", err.message);
    if (cache) {
      return res.status(200).json({ ...cache, cached: true, stale: true });
    }
    return res.status(500).json({ error: "Failed to fetch market data" });
  }
};
