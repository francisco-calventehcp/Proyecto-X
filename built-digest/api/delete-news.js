const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

const NEWS_KEY = "built-digest:news";
const META_KEY = "built-digest:meta";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const secret = req.query.secret;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ?all=true → borra todo
    if (req.query.all === "true") {
      await redis.del(NEWS_KEY);
      await redis.del(META_KEY);
      return res.status(200).json({ status: "success", message: "Todas las noticias eliminadas", total: 0 });
    }

    // ?id=xxx → borra una noticia concreta
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Falta el parámetro id o all=true" });
    }

    const articles = (await redis.get(NEWS_KEY)) || [];
    const filtered = articles.filter(a => a.id !== id);

    if (filtered.length === articles.length) {
      return res.status(404).json({ error: "Noticia no encontrada" });
    }

    await redis.set(NEWS_KEY, filtered);

    return res.status(200).json({
      status: "success",
      message: `Noticia eliminada`,
      total: filtered.length,
    });

  } catch (err) {
    console.error("[delete-news] Error:", err.message);
    return res.status(500).json({ status: "error", message: err.message });
  }
};
