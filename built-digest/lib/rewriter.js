// ─────────────────────────────────────────────────────────────────────────────
// REWRITER — Reescribe noticias con Groq + asigna imágenes temáticas de Unsplash
// ─────────────────────────────────────────────────────────────────────────────

const { Groq } = require("groq-sdk");
const { assignJournalist } = require("./journalists");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── IMÁGENES POR CATEGORÍA ────────────────────────────────────────────────────
// IDs verificados de Unsplash (CDN images.unsplash.com, sin API key)
// Seleccionados manualmente por relevancia temática

const CATEGORY_IMAGES = {
  Residencial: [
    { id: "photo-1560518883-ce09059eeffa", desc: "edificio viviendas moderno" },
    { id: "photo-1512917774080-9991f1c4c750", desc: "casa moderna exterior" },
    { id: "photo-1600596542815-ffad4c1539a9", desc: "vivienda unifamiliar" },
    { id: "photo-1580587771525-78b9dba3b914", desc: "urbanización residencial" },
    { id: "photo-1570129477492-45c003edd2be", desc: "fachada edificio residencial" },
    { id: "photo-1493809842364-78817add7ffb", desc: "interior piso moderno" },
  ],
  Oficinas: [
    { id: "photo-1497366216548-37526070297c", desc: "oficinas modernas interior" },
    { id: "photo-1486406146926-c627a92ad1ab", desc: "rascacielos oficinas" },
    { id: "photo-1541746972996-4e0b0f43e02a", desc: "edificio corporativo" },
    { id: "photo-1497215842964-222b430dc094", desc: "open space coworking" },
    { id: "photo-1554469384-e58fac16e23a", desc: "edificio oficinas exterior" },
    { id: "photo-1582268611958-ebfd161ef9cf", desc: "espacio trabajo moderno" },
  ],
  Inversión: [
    { id: "photo-1611974789855-9c2a0a7236a3", desc: "inversión financiera" },
    { id: "photo-1535320903710-d993d3d77d29", desc: "mercado financiero" },
    { id: "photo-1590283603385-17ffb3a7f29f", desc: "análisis inversión" },
    { id: "photo-1460472178825-e5240623afd5", desc: "ciudad skyline inversión" },
    { id: "photo-1563986768609-322da13575f3", desc: "gráfico crecimiento" },
    { id: "photo-1507679799987-c73779587ccf", desc: "negocio corporativo" },
  ],
  Regulación: [
    { id: "photo-1589829545856-d10d557cf95f", desc: "legislación documentos" },
    { id: "photo-1554469384-e58fac16e23a", desc: "edificio gobierno" },
    { id: "photo-1434626881859-194d67b2b86f", desc: "balanza justicia ley" },
    { id: "photo-1450101499163-c8848c66ca85", desc: "contrato firma documentos" },
    { id: "photo-1507003211169-0a1dd7228f2d", desc: "abogado gestión" },
    { id: "photo-1521791136064-7986c2920216", desc: "reunión acuerdo" },
  ],
  Mercado: [
    { id: "photo-1560448204-e02f11c3d0e2", desc: "ciudad skyline mercado" },
    { id: "photo-1486325212027-8081e485255e", desc: "ciudad moderna" },
    { id: "photo-1477959858617-67f85cf4f1df", desc: "skyline ciudad" },
    { id: "photo-1449824913935-59a10b8d2000", desc: "calle ciudad urbana" },
    { id: "photo-1480714378408-67cf0d13bc1b", desc: "panorámica ciudad" },
    { id: "photo-1444723121867-7a241cacace9", desc: "ciudad edificios" },
  ],
  Logística: [
    { id: "photo-1586528116311-ad8dd3c8310d", desc: "almacén logístico" },
    { id: "photo-1553413077-190dd305871c", desc: "nave industrial interior" },
    { id: "photo-1601584115197-04ecc0da31d7", desc: "camión logística transporte" },
    { id: "photo-1565793979956-8dbe32e0f2e5", desc: "parque logístico drones" },
    { id: "photo-1568177426-5b7673d3e6c2", desc: "almacén distribución" },
    { id: "photo-1558618666-fcd25c85cd64", desc: "centro distribución" },
  ],
  SOCIMIs: [
    { id: "photo-1486406146926-c627a92ad1ab", desc: "edificio corporativo SOCIMI" },
    { id: "photo-1611974789855-9c2a0a7236a3", desc: "bolsa inversión SOCIMI" },
    { id: "photo-1464938050520-ef2270bb8ce8", desc: "cartera inmobiliaria" },
    { id: "photo-1507679799987-c73779587ccf", desc: "empresa cotizada" },
    { id: "photo-1460472178825-e5240623afd5", desc: "skyline patrimonio" },
    { id: "photo-1573164713714-d95e436ab8d6", desc: "análisis financiero" },
  ],
  Proptech: [
    { id: "photo-1451187580459-43490279c0fa", desc: "tecnología digital" },
    { id: "photo-1518770660439-4636190af475", desc: "innovación tech" },
    { id: "photo-1504384308090-c894fdcc538d", desc: "startup tecnología" },
    { id: "photo-1620712943543-bcc4688e7485", desc: "inteligencia artificial" },
    { id: "photo-1498050108023-c5249f4df085", desc: "programación código" },
    { id: "photo-1555774698-0b77e0d5fac6", desc: "app móvil proptech" },
  ],
  Comercial: [
    { id: "photo-1441986300917-64674bd600d8", desc: "centro comercial" },
    { id: "photo-1567401893414-76b7b1e5a7a5", desc: "tiendas retail" },
    { id: "photo-1555529669-e69e7aa0ba9a", desc: "comercio local" },
    { id: "photo-1519389950473-47ba0277781c", desc: "espacio comercial moderno" },
    { id: "photo-1528698827591-e19ccd7bc23d", desc: "galería comercial" },
    { id: "photo-1534723452862-4c874986df97", desc: "tienda concept store" },
  ],
  Hotelero: [
    { id: "photo-1566073771259-6a8506099945", desc: "hotel lujo exterior" },
    { id: "photo-1582719508461-905c673771fd", desc: "hotel boutique" },
    { id: "photo-1455587734955-081b22074882", desc: "hotel resort playa" },
    { id: "photo-1571896349842-33c89424de2d", desc: "hotel interior lujo" },
    { id: "photo-1520250497591-112f2f40a3f4", desc: "hotel piscina exterior" },
    { id: "photo-1551882547-ff40c63fe5fa", desc: "hotel habitación premium" },
  ],
};

// Keywords por categoría para búsqueda más precisa
const CATEGORY_KEYWORDS = {
  Residencial: ["apartment building", "residential house", "modern home"],
  Oficinas:    ["office building", "corporate office", "business center"],
  Inversión:   ["investment finance", "real estate investment", "city skyline"],
  Regulación:  ["law building", "government architecture", "contract signing"],
  Mercado:     ["city skyline", "urban architecture", "real estate market"],
  Logística:   ["warehouse logistics", "industrial park", "distribution center"],
  SOCIMIs:     ["corporate building", "real estate portfolio", "skyline"],
  Proptech:    ["technology innovation", "digital startup", "smart building"],
  Comercial:   ["shopping center", "retail store", "commercial space"],
  Hotelero:    ["luxury hotel", "hotel architecture", "resort building"],
};

function getImageUrl(category, articleId) {
  const images = CATEGORY_IMAGES[category] || CATEGORY_IMAGES["Mercado"];
  // Usar el id del artículo como seed para siempre asignar la misma imagen al mismo artículo
  const seed = articleId ? articleId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) : Math.floor(Math.random() * images.length);
  const img = images[seed % images.length];
  return `https://images.unsplash.com/${img.id}?w=1200&h=600&fit=crop&q=80`;
}

function getThumbUrl(category, articleId) {
  const images = CATEGORY_IMAGES[category] || CATEGORY_IMAGES["Mercado"];
  const seed = articleId ? articleId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) : 0;
  const img = images[(seed + 1) % images.length]; // índice +1 para variedad en thumbnails
  return `https://images.unsplash.com/${img.id}?w=600&h=400&fit=crop&q=75`;
}

// ── PROMPT ────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres el editor jefe de Built Digest, portal de noticias inmobiliarias español de referencia.
Reescribes noticias del sector inmobiliario español con calidad editorial de primer nivel.

REGLAS ESTRICTAS:
1. NUNCA copies frases textuales de la fuente. Reescribe completamente con voz propia.
2. Mantén todos los DATOS numéricos exactos (cifras, porcentajes, precios, metros cuadrados).
3. Mantén los NOMBRES propios correctos (empresas, personas, ubicaciones).
4. Tono: periodístico, directo, con criterio. Como El Confidencial o Cinco Días.
5. Español de España. Sin latinismos.
6. NO menciones la fuente original.
7. El cuerpo debe tener 5-6 párrafos completos, cada uno de 3-4 frases con datos, contexto e implicaciones.

RESPONDE ÚNICAMENTE con JSON válido, sin markdown ni backticks:
{
  "title": "Titular (máx 120 chars, con el dato clave, impactante)",
  "excerpt": "Entradilla 2-3 frases (máx 250 chars). El qué, por qué importa, dato principal.",
  "body": "Cuerpo con 5-6 párrafos separados por \\n\\n. Flujo narrativo continuo, sin subtítulos.",
  "category": "Residencial|Oficinas|Inversión|Regulación|Mercado|Logística|SOCIMIs|Proptech|Comercial|Hotelero",
  "readTime": 5
}`;

// ── REESCRIBIR UN ARTÍCULO ─────────────────────────────────────────────────────
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
          content: `Reescribe esta noticia inmobiliaria española con profundidad editorial:

TITULAR ORIGINAL: ${article.originalTitle}
EXTRACTO: ${article.originalExcerpt}
CATEGORÍA: ${article.category}
PERIODISTA: ${journalist.name} (${journalist.bio})

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
      title:               parsed.title,
      excerpt:             parsed.excerpt,
      body:                parsed.body || "",
      category,
      readTime:            parsed.readTime || 5,
      image:               getImageUrl(category, id),
      imageThumb:          getThumbUrl(category, id),
      journalist:          journalist.name,
      journalistInitials:  journalist.initials,
      journalistBio:       journalist.bio,
      publishedAt:         new Date().toISOString(),
      originalSource:      article.sourceId,
      originalUrl:         article.originalUrl,
    };
  } catch (err) {
    console.error(`[rewriter] Error en "${article.originalTitle}":`, err.message);
    return null;
  }
}

// ── PROCESAR LOTE ─────────────────────────────────────────────────────────────
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
