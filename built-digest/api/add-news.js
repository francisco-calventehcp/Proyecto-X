const { saveNews } = require("../lib/storage");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const secret = req.query.secret;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { article } = req.body;

    if (!article || !article.title || !article.excerpt) {
      return res.status(400).json({ error: "Faltan campos obligatorios: title, excerpt" });
    }

    const newArticle = {
      id: article.id || (Date.now().toString(36) + Math.random().toString(36).substr(2, 6)),
      title: article.title,
      excerpt: article.excerpt,
      body: article.body || article.excerpt,
      category: article.category || "Mercado",
      journalist: article.journalist || "Borja Guiochea",
      journalistInitials: article.journalistInitials || "BG",
      publishedAt: article.publishedAt || new Date().toISOString(),
      originalSource: "manual",
      originalUrl: "",
    };

    const result = await saveNews([newArticle]);

    return res.status(200).json({
      status: "success",
      message: "Noticia publicada",
      added: result.added,
      total: result.total,
    });

  } catch (err) {
    console.error("[add-news] Error:", err.message);
    return res.status(500).json({ status: "error", message: err.message });
  }
};
