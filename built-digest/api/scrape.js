const Parser = require("rss-parser");
const cheerio = require("cheerio");

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; BuiltDigestBot/1.0; +https://builtdigest.com)",
  },
});

const SOURCES = [
  {
    id: "brainsre",
    name: "Brainsre News",
    type: "rss",
    url: "https://brainsre.news/feed/",
    maxItems: 8,
  },
  {
    id: "observatorio",
    name: "Observatorio Inmobiliario",
    type: "rss",
    url: "https://observatorioinmobiliario.es/feed/",
    maxItems: 6,
  },
  {
    id: "ejeprime",
    name: "EjePrime",
    type: "html",
    url: "https://www.ejeprime.com/",
    maxItems: 6,
  },
];

async function scrapeRSS(source) {
  try {
    const feed = await parser.parseURL(source.url);
    const articles = feed.items.slice(0, source.maxItems).map((item) => ({
      sourceId: source.id,
      sourceName: source.name,
      originalTitle: item.title || "",
      originalExcerpt: stripHtml(item.contentSnippet || item.content || "").substring(0, 400),
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

async function scrapeHTML(source) {
  try {
    const res = await fetch(source.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BuiltDigestBot/1.0; +https://builtdigest.com)",
      },
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    const articles = [];

    $("article, .post, .entry, .news-item, .article-card, .td-module-container")
      .slice(0, source.maxItems)
      .each((i, el) => {
        const $el = $(el);
        const title =
          $el.find("h2 a, h3 a, .title a, .entry-title a").first().text().trim() ||
          $el.find("h2, h3, .title, .entry-title").first().text().trim();
        const link =
          $el.find("h2 a, h3 a, .title a, .entry-title a").first().attr("href") || "";
        const excerpt =
          $el.find("p, .excerpt, .summary, .entry-content").first().text().trim();

        if (title && title.length > 15) {
          articles.push({
            sourceId: source.id,
            sourceName: source.name,
            originalTitle: title,
            originalExcerpt: excerpt.substring(0, 400),
            originalUrl: link.startsWith("http") ? link : new URL(link, source.url).href,
            pubDate: new Date().toISOString(),
            category: guessCategory(title + " " + excerpt),
          });
        }
      });

    console.log(`[${source.id}] ${articles.length} artículos via HTML`);
    return articles;
  } catch (err) {
    console.error(`[${source.id}] HTML error:`, err.message);
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
    const articles = source.type === "rss"
      ? await scrapeRSS(source)
      : await scrapeHTML(source);
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
