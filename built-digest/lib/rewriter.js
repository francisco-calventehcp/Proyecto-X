const { Groq } = require("groq-sdk");
const { assignJournalist } = require("./journalists");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
  const seedNum = seed ? seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0) : 0;
  const id = ids[seedNum % ids.length];
  return `https://picsum.photos/id/${id}/1200/600`;
}

const SYSTEM_PROMPT = `Eres el editor jefe de Built Digest, portal de noticias inmobiliarias español de referencia.
Reescribes noticias del sector inmobiliario español con calidad editorial de primer nivel.

REGLAS ESTRICTAS:
1. NUNCA copies frases textuales de la fuente. Reescribe completamente con voz propia.
2. Mantén todos los DATOS numéricos exactos (cifras, porcentajes, precios, metros cuadrados).
3. Mantén los NOMBRES propios correctos (empresas, personas, ubicaciones).
4. Tono: periodístico, directo, con criterio. Como El Confidencial o Cinco Días.
5. Español de España. Sin latinismos.
6. NO menciones la fuente original.
7. El cuerpo debe tener 5-6 párrafos completos, cada uno de 3-4 frases. Contexto, datos, implicaciones, perspectiva.

RESPONDE ÚNICAMENTE con JSON válido, sin markdown ni backticks:
{
  "title": "Titular (máx 120 chars, con el dato clave, impactante)",
  "excerpt": "Entradilla de 2-3 frases (máx 250 chars). El qué, por qué importa, dato principal.",
  "body": "Cuerpo completo con 5-6 párrafos separados por \\n\\n. Cada párrafo de 3-4 frases con datos, contexto y análisis. NO uses subtítulos. Flujo narrativo continuo.",
  "category": "Residencial|Oficinas|Inversión|Regulación|Mercado|Logística|SOCIMIs|Proptech|Comercial|Hotelero",
  "readTime": 5
}`;

async function rewriteArticle(article) {
  const journalist = assignJournalist(article.category);
  const id = generateId();

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1400,
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Reescribe esta noticia del sector inmobiliario español con profundidad editorial:

TITULAR ORIGINAL: ${article.originalTitle}
EXTRACTO: ${article.originalExcerpt}
CATEGORÍA: ${article.category}
PERIODISTA: ${journalist.name} (${journalist.bio})

Responde solo con JSON estricto. El body debe tener 5-6 párrafos ricos en datos y contexto.`,
        },
      ],
    });

    const text = response.choices[0].message.content.trim();
    const clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(clean);
    const category = parsed.category || article.category;

    return {
      id,
      title:               parsed.title,
      excerpt:             parsed.excerpt,
      body:                parsed.body || "",
      category,
      readTime:            parsed.readTime || 5,
      image:               getImageUrl(category, id),
      journalist:          journalist.name,
      journalistInitials:  journalist.initials,
      journalistBio:       journalist.bio,
      publishedAt:         new Date().toISOString(),
      originalSource:      article.sourceId,
      originalUrl:         article.originalUrl,
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
    await new Promise(r => setTimeout(r, 400));
  }
  console.log(`[rewriter] ${results.length}/${toProcess.length} artículos procesados`);
  return results;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

module.exports = { rewriteArticle, rewriteBatch };
