const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const NEWS_KEY = "built-digest:news";
const META_KEY = "built-digest:meta";
const MAX_ARTICLES = 60;

async function getNews({ limit = 20, offset = 0 } = {}) {
  try {
    const articles = (await redis.get(NEWS_KEY)) || [];
    return {
      articles: articles.slice(offset, offset + limit),
      total: articles.length,
    };
  } catch (err) {
    console.error("[storage] Read error:", err.message);
    return { articles: [], total: 0 };
  }
}

async function getMeta() {
  try {
    return (await redis.get(META_KEY)) || { lastRun: null, totalProcessed: 0 };
  } catch {
    return { lastRun: null, totalProcessed: 0 };
  }
}

async function saveNews(newArticles) {
  try {
    const existing = (await redis.get(NEWS_KEY)) || [];
    const existingTitles = new Set(
      existing.map((a) =>
        a.title.toLowerCase().replace(/[^a-záéíóúñ]/g, "").substring(0, 40)
      )
    );
    const fresh = newArticles.filter((a) => {
      const key = a.title.toLowerCase().replace(/[^a-záéíóúñ]/g, "").substring(0, 40);
      return !existingTitles.has(key);
    });
    const merged = [...fresh, ...existing].slice(0, MAX_ARTICLES);
    await redis.set(NEWS_KEY, merged);
    const meta = await getMeta();
    await redis.set(META_KEY, {
      lastRun: new Date().toISOString(),
      totalProcessed: (meta.totalProcessed || 0) + fresh.length,
      lastArticleCount: fresh.length,
    });
    console.log(`[storage] ${fresh.length} nuevos artículos (${merged.length} total)`);
    return { added: fresh.length, total: merged.length };
  } catch (err) {
    console.error("[storage] Write error:", err.message);
    throw err;
  }
}

async function clearAll() {
  await redis.del(NEWS_KEY);
  await redis.del(META_KEY);
}

module.exports = { getNews, getMeta, saveNews, clearAll };
