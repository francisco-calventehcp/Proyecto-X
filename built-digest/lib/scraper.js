// ─────────────────────────────────────────────────────────────
// SCRAPER — Extrae noticias inmobiliarias españolas via NewsAPI
// ─────────────────────────────────────────────────────────────

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const NEWSAPI_URL = "https://newsapi.org/v2/everything";

const QUERIES = [
  "vivienda España precio",
  "inmobiliario España inversión",
  "hipotecas España mercado",
  "alquiler España regulación",
  "promotora inmobiliaria España",
];

// ─── DETECCIÓN DE CATEGORÍA ───────────────────────────────────

function guessCategory(text) {
  const rules = [
    [/oficina|coworking|contrataci[oó]n/i,           "Oficinas"],
    [/log[ií]stic|nave|almac[eé]n|industrial/i,       "Logística"],
    [/hotel|tur[ií]stic|vacacional/i,                 "Hotelero"],
    [/centro comercial|retail|tienda/i,               "Comercial"],
    [/socimi|cotizad|bolsa|dividendo/i,               "SOCIMIs"],
    [/promot|obra nueva|vivienda nueva/i,             "Residencial"],
    [/regula|ley|decreto|gobierno|ministerio/i,       "Regulación"],
    [/proptech|tecnolog|digital|startup/i,            "Proptech"],
    [/inversi[oó]n|fondo|capital|adquisici/i,         "Inversión"],
    [/alquil|arrendamiento|inquilino|renta/i,         "Regulación"],
    [/precio|hipoteca|compraventa|euríbor/i,          "Mercado"],
  ];
  for (const [regex, cat] of rules) {
    if (regex.test(text)) return cat;
  }
  return "Mercado";
}

// ─── FETCH NEWSAPI ────────────────────────────────────────────

async function fetchFromNewsAPI(query) {
  try {
    const params = new URLSearchParams({
      q: query,
      language: "es",
      sortBy: "publishedAt",
      pageSize: "5",
      apiKey: NEWSAPI_KEY,
    });

    const res = await fetch(`${NEWSAPI_URL}?${params}`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`[newsapi] HTTP ${res.status} para query: ${query}`);
      return [];
    }

    const data = await res.json();

    if (data.status !== "ok" || !data.articles) {
      console.error(`[newsapi] Error: ${data.message || "sin artículos"}`);
      return [];
    }

    return data.articles
      .filter(a => a.title && a.title !== "[Removed]" && a.description)
      .map(a => ({
        sourceId: "newsapi",
        sourceName: a.source?.name || "NewsAPI",
        originalTitle: a.title,
        originalExcerpt: (a.description || "").substring(0, 400),
        originalUrl: a.url || "",
        pubDate: a.publishedAt || new Date().toISOString(),
        category: guessCategory(a.title + " " + (a.description || "")),
      }));

  } catch (err) {
    console.error(`[newsapi] Error en query "${query}":`, err.message);
    return [];
  }
}

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────────

async function scrapeAllSources() {
  if (!NEWSAPI_KEY) {
    console.error("[scraper] NEWSAPI_KEY no definida");
    return [];
  }

  const allArticles = [];

  for (const query of QUERIES) {
    const articles = await fetchFromNewsAPI(query);
    console.log(`[newsapi] "${query}" → ${articles.length} artículos`);
    allArticles.push(...articles);
    // Pausa entre peticiones
    await new Promise(r => setTimeout(r, 200));
  }

  // Deduplicar por título
  const seen = new Set();
  const unique = allArticles.filter(a => {
    const key = a.originalTitle.toLowerCase().replace(/[^a-záéíóúñ]/g, "").substring(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Ordenar por fecha, más reciente primero
  unique.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  console.log(`[scraper] Total: ${allArticles.length} raw → ${unique.length} únicos`);
  return unique.slice(0, 12);
}

module.exports = { scrapeAllSources };
