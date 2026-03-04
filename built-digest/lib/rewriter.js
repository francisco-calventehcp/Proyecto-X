const { Groq } = require("groq-sdk");
const { assignJournalist } = require("./journalists");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Picsum Photos — gratis, sin API key, imágenes reales de alta calidad
// Usamos IDs fijos por categoría para que las imágenes sean coherentes
const CATEGORY_IMAGE_IDS = {
  "Residencial": [164, 165, 323, 366, 431, 478, 534],
  "Oficinas":    [1029, 1033, 1040, 1048, 1060, 1074, 1080],
  "Inversión":   [256, 260, 265, 270, 275, 280, 285],
  "Regulación":  [208, 209, 210, 211, 212, 213, 214],
  "Mercado":     [371, 374, 377, 380, 383, 386, 389],
  "Logística":   [325, 326, 327, 328, 329, 330, 331],
  "SOCIMIs":     [240, 241, 242, 243, 244, 245, 246],
  "Proptech":    [0, 1, 2, 3, 4, 5, 6],
  "Comercial":   [180, 181, 182, 183, 184, 185, 186],
  "Hotelero":    [400, 401, 402, 403, 404, 405, 406],
  "default":     [350, 351, 352, 353, 354, 355, 356],
};

function getImageUrl(category, seed) {
  const ids = CATEGORY_IMAGE_IDS[category] || CATEGORY_IMAGE_IDS["default"];
  // Usar el seed para elegir siempre la misma imagen para el mismo artículo
  const seedNum = seed ? seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) : 0;
  const id = ids[seedNum % ids.length];
  return `https://picsum.photos/id/${id}/800/450`;
}

const SYSTEM_PROMPT = `Eres el editor de Built Digest, portal de noticias inmobiliarias español independiente.
Tu trabajo es REESCRIBIR noticias del sector inmobiliario español para publicarlas como propias.

REGLAS ESTRICTAS:
1. NUNCA copies frases textuales. Reescribe completamente.
2. Mantén los DATOS numéricos exactos (cifras, porcentajes, precios, metros cuadrados).
3. Mantén los NOMBRES propios correctos (empresas, personas, ubicaciones).
4. Tono editorial, profesional, directo. Sin lenguaje genérico de IA.
5. Español de España (no latinoamericano).
6. NO menciones la fuente original.

RESPONDE ÚNICAMENTE con JSON válido, sin markdown ni backticks:
{
  "title": "Titular reescrito (máx 120 chars, impactante, con dato clave)",
  "excerpt": "Entradilla de 2 frases (máx 200 chars). Gancho + contexto.",
  "body": "Cuerpo de 3-4 párrafos. Datos, contexto, implicaciones.",
  "category": "Residencial|Oficinas|Inversión|Regulación|Mercado|Logística|SOCIMIs|Proptech|Comercial|Hotelero"
}`;

async function rewriteArticle(article) {
  const journalist = assignJournalist(article.category);
  const id = generateId();

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 900,
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Reescribe esta noticia del sector inmobiliario español:

TITULAR ORIGINAL: ${article.originalTitle}
EXTRACTO: ${article.originalExcerpt}
CATEGORÍA DETECTADA: ${article.category}
PERIODISTA ASIGNADO: ${journalist.name} (${journalist.bio})

Responde solo con JSON estricto.`,
        },
      ],
    });

    const text = response.choices[0].message.content.trim();
    const clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(clean);
    const category = parsed.category || article.category;

    return {
      id,
      title: parsed.title,
      excerpt: parsed.excerpt,
      body: parsed.body || "",
      category,
      image: getImageUrl(category, id),
      journalist: journalist.name,
      journalistInitials: journalist.initials,
      publishedAt: new Date().toISOString(),
      originalSource: article.sourceId,
      originalUrl: article.originalUrl,
    };
  } catch (err) {
    console.error(`[rewriter] Error: "${article.originalTitle}":`, err.message);
    return null;
  }
}

async function rewriteBatch(articles, maxArticles = 8) {
  const toProcess = articles.slice(0, maxArticles);
  const results = [];
  for (const article of toProcess) {
    const rewritten = await rewriteArticle(article);
    if (rewritten) results.push(rewritten);
    await new Promise(r => setTimeout(r, 300));
  }
  console.log(`[rewriter] ${results.length}/${toProcess.length} artículos procesados`);
  return results;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

module.exports = { rewriteArticle, rewriteBatch };
