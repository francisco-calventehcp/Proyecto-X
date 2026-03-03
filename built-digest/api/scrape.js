const Parser = require("rss-parser");
const cheerio = require("cheerio");

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  },
});

const SOURCES = [
  {
    id: "google_inversion",
    name: "Google News — Inversión inmobiliaria",
    type: "rss",
    url: "https://news.google.com/rss/search?q=inversion+inmobiliaria+españa&hl=es&gl=ES&ceid=ES:es",
    maxItems: 5,
  },
  {
    id: "google_vivienda",
    name: "Google News — Vivienda España",
    type: "rss",
    url: "https://news.google.com/rss/search?q=vivienda+precio+españa&hl=es&gl=ES&ceid=ES:es",
    maxItems: 5,
  },
  {
    id: "google_inmobiliaria",
    name: "Google News — Sector inmobiliario",
    type: "rss",
    url: "https://news.google.com/rss/search?q=sector+inmobiliario+españa&hl=es&gl=ES&ceid=ES:es",
    maxItems: 5,
  },
  {
    id: "google_alquiler",
    name: "Google News — Alquiler",
    type: "rss",
    url: "https://news.google.com/rss/search?q=alquiler+vivienda+españa&hl=es&gl=ES&ceid=ES:es",
    maxItems: 4,
  },
];

async function scrapeRSS(source) {
  try {
    const feed = await parser.parseURL(source.url);
    const articles = feed.items.slice(0, source.maxItems).map((item) => ({
      sourceId: source.id,
      sourceName: source.name,
      originalTitle: item.title || "",
      originalExcerpt: stripHtml(item.contentSnippet || item.content || item.title || "").substring(0, 400),
      originalUrl: item.link || "",
      pubDate: item.pubDate || new Date().toISOString(),
      category: guessCategory(item.title + " " + (item.contentSnippet || "")),
    }));
    console.log(`[${source.id}] ${articles.length} artículos via RSS`);
    return articles;
  } catch (err) {
    console.error(`[${source.id}] RSS error:`, err.message);
    return [];
  }
}

function guessCategory(text) {
  const rules = [
    [/oficina|coworking|contrataci[oó]n/i,           "Oficinas"],
    [/alquil|arrendamiento|inquilino|renta/i,         "Alquiler"],
    [/log[ií]stic|nave|almac[eé]n|industrial/i,       "Logística"],
    [/hotel|tur[ií]stic|vacacional/i,                 "Hotelero"],
    [/centro comercial|retail|tienda/i,               "Comercial"],
    [/socimi|cotizad|bolsa|dividendo|opa/i,           "SOCIMIs"],
    [/promot|obra nueva|residencial|vivienda nueva/i, "Residencial"],
    [/regula|ley|decreto|gobierno|ministerio|boe/i,   "Regulación"],
    [/proptech|tecnolog|digital|startup/i,            "Proptech"],
    [/data center|centro de datos/i,                  "Data Centers"],
    [/inversi[oó]n|fondo|capital|adquisici/i,         "Inversión"],
    [/precio|hipoteca|compraventa|mercado/i,          "Mercado"],
    [/suelo|urbanismo|plan parcial/i,                 "Urbanismo"],
    [/sostenib|verde|esg|rehabilita/i,                "Sostenibilidad"],
  ];
  for (const [regex, cat] of rules) {
    if (regex.test(text)) return cat;
  }
  return "Mercado";
}

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

async function scrapeAllSources() {
  const allArticles = [];

  for (const source of SOURCES) {
    const articles = await scrapeRSS(source);
    allArticles.push(...articles);
  }

  const seen = new Set();
  const unique = allArticles.filter((a) => {
    const key = a.originalTitle.toLowerCase().replace(/[^a-záéíóúñ]/g, "").substring(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  console.log(`[scraper] Total: ${allArticles.length} raw → ${unique.length} únicos`);
  return unique.slice(0, 12);
}

module.exports = { scrapeAllSources, SOURCES };
