// ─────────────────────────────────────────────────────────────
// STORAGE — Lectura y escritura en Vercel KV (base de datos)
// ─────────────────────────────────────────────────────────────

const { kv } = require("@vercel/kv");

const NEWS_KEY = "built-digest:news";
const META_KEY = "built-digest:meta";
const MAX_ARTICLES = 60; // ~1 semana de contenido

// ─── LECTURA ──────────────────────────────────────────────────

async function getNews({ limit = 20, offset = 0 } = {}) {
  try {
    const articles = (await kv.get(NEWS_KEY)) || [];
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
    return (await kv.get(META_KEY)) || { lastRun: null, totalProcessed: 0 };
  } catch {
    return { lastRun: null, totalProcessed: 0 };
  }
}

// ─── ESCRITURA ────────────────────────────────────────────────

async function saveNews(newArticles) {
  try {
    const existing = (await kv.get(NEWS_KEY)) || [];

    // Deduplicar por título
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
    await kv.set(NEWS_KEY, merged);

    // Actualizar metadatos
    const meta = await getMeta();
    await kv.set(META_KEY, {
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

// ─── BORRAR (solo para desarrollo) ───────────────────────────

async function clearAll() {
  await kv.del(NEWS_KEY);
  await kv.del(META_KEY);
  console.log("[storage] Base de datos limpiada");
}

module.exports = { getNews, getMeta, saveNews, clearAll };
