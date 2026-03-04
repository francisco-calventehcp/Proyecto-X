// ─────────────────────────────────────────────────────────────
// REWRITER — Reescribe noticias usando Groq (GRATIS)
// Modelo: llama-3.3-70b-versatile
// ─────────────────────────────────────────────────────────────

const { Groq } = require("groq-sdk");
const { assignJournalist } = require("./journalists");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `Eres el editor de Built Digest, portal de noticias inmobiliarias español independiente fundado en 2020.
Tu trabajo es REESCRIBIR noticias del sector inmobiliario español para publicarlas como propias.

REGLAS ESTRICTAS:
1. NUNCA copies frases textuales de la fuente. Reescribe completamente con tus propias palabras.
2. Mantén los DATOS numéricos exactos (cifras, porcentajes, precios, metros cuadrados).
3. Mantén los NOMBRES propios correctos (empresas, personas, ubicaciones).
4. Tono editorial, profesional, directo. Sin lenguaje genérico de IA.
5. Escribe en español de España (no latinoamericano).
6. NO menciones NUNCA la fuente original.
7. Escribe como si Built Digest hubiera investigado la noticia directamente.

RESPONDE ÚNICAMENTE con JSON válido, sin markdown ni backticks:
{
  "title": "Titular reescrito (máx 120 chars, impactante, con dato clave)",
  "excerpt": "Entradilla de 2 frases (máx 200 chars). Gancho + contexto.",
  "body": "Cuerpo de 3-4 párrafos. Datos, contexto, implicaciones.",
  "category": "Residencial|Oficinas|Inversión|Regulación|Mercado|Logística|SOCIMIs|Proptech|Comercial|Hotelero"
}`;

async function rewriteArticle(article) {
  const journalist = assignJournalist(article.category);

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

    return {
      id: generateId(),
      title: parsed.title,
      excerpt: parsed.excerpt,
      body: parsed.body || "",
      category: parsed.category || article.category,
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
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`[rewriter] ${results.length}/${toProcess.length} artículos procesados`);
  return results;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

module.exports = { rewriteArticle, rewriteBatch };
