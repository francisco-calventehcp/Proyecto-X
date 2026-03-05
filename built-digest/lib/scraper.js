// ─────────────────────────────────────────────────────────────────────────────
// SCRAPER — Noticias inmobiliarias españolas
// Fuentes (en orden de prioridad):
//   1. Brainsre.news RSS      — funciona sin key
//   2. Google News RSS        — sin key, puede fallar desde Vercel
//   3. NewsAPI                — requiere NEWSAPI_KEY (gratis 100 req/día)
//   4. Seed articles          — fallback garantizado si todo falla
// ─────────────────────────────────────────────────────────────────────────────

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;

// ── DETECCIÓN DE CATEGORÍA ─────────────────────────────────────────────────────
function guessCategory(text) {
  const t = (text || "").toLowerCase();
  if (/oficina|coworking|flex.?space|contrataci[oó]n.?oficin/i.test(t))   return "Oficinas";
  if (/log[ií]stic|nave.?industrial|almac[eé]n|parque.?industrial/i.test(t)) return "Logística";
  if (/hotel|resort|tur[ií]stic|apart.?tur[ií]stic|vacacional/i.test(t))  return "Hotelero";
  if (/centro.?comercial|retail|local.?comercial|tienda|shopping/i.test(t)) return "Comercial";
  if (/socimi|cotizad|bolsa|dividend|merlin|colonial/i.test(t))             return "SOCIMIs";
  if (/promot|obra.?nueva|vivienda.?nueva|cooperativa/i.test(t))            return "Residencial";
  if (/ley|decreto|gobierno|ministerio|regulaci|normativa|zona.?tensionada/i.test(t)) return "Regulación";
  if (/proptech|startup|tecnolog|digital|plataforma.?inmobil/i.test(t))    return "Proptech";
  if (/blackstone|fondo|capital|adquisici|compra.+cartera|deal|inversor/i.test(t)) return "Inversión";
  if (/alquil|arrendamiento|inquilino|renta\b/i.test(t))                   return "Regulación";
  if (/precio|hipoteca|euríbor|compraventa|ipc|ipv|tasaci/i.test(t))       return "Mercado";
  return "Mercado";
}

// ── UTIL: decodificar XML ──────────────────────────────────────────────────────
function decodeXml(str) {
  return (str || "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&apos;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// ── 1. BRAINSRE RSS ────────────────────────────────────────────────────────────
async function fetchBrainsre() {
  try {
    const res = await fetch("https://brainsre.news/feed/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BuiltDigest/1.0)",
        "Accept": "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const items = parseRSS(xml, "brainsre", "Brainsre News");
    console.log(`[scraper] Brainsre → ${items.length} artículos`);
    return items.slice(0, 8);
  } catch (err) {
    console.warn("[scraper] Brainsre error:", err.message);
    return [];
  }
}

// ── 2. GOOGLE NEWS RSS ─────────────────────────────────────────────────────────
async function fetchGoogleNews(query) {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://news.google.com/rss/search?q=${encoded}&hl=es&gl=ES&ceid=ES:es`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BuiltDigest/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const items = parseRSS(xml, "googlenews", "Google News");
    // Filtrar noticias que realmente sean del sector inmobiliario español
    const filtered = items.filter(a => {
      const t = (a.originalTitle + " " + a.originalExcerpt).toLowerCase();
      return /inmobil|vivienda|piso|alquil|hipoteca|promot|oficin|log[ií]stic|hotel|socimi|fondo.+inm/i.test(t);
    });
    return filtered.slice(0, 4);
  } catch (err) {
    console.warn(`[scraper] Google News "${query}" error:`, err.message);
    return [];
  }
}

// ── 3. NEWSAPI ─────────────────────────────────────────────────────────────────
async function fetchNewsAPI(query) {
  if (!NEWSAPI_KEY) return [];
  try {
    const params = new URLSearchParams({
      q: query, language: "es", sortBy: "publishedAt", pageSize: "6", apiKey: NEWSAPI_KEY,
    });
    const res = await fetch(`https://newsapi.org/v2/everything?${params}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== "ok" || !data.articles) return [];
    return data.articles
      .filter(a => a.title && a.title !== "[Removed]" && a.description)
      .map(a => ({
        sourceId: "newsapi", sourceName: a.source?.name || "NewsAPI",
        originalTitle: a.title,
        originalExcerpt: (a.description || "").substring(0, 400),
        originalUrl: a.url || "",
        pubDate: a.publishedAt || new Date().toISOString(),
        category: guessCategory(a.title + " " + (a.description || "")),
      }))
      .slice(0, 5);
  } catch (err) {
    console.warn(`[scraper] NewsAPI "${query}" error:`, err.message);
    return [];
  }
}

// ── PARSER RSS GENÉRICO ────────────────────────────────────────────────────────
function parseRSS(xml, sourceId, sourceName) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const title   = decodeXml(/<title[^>]*>([\s\S]*?)<\/title>/.exec(item)?.[1] || "");
    const link    = /<link>([\s\S]*?)<\/link>/.exec(item)?.[1]?.trim() || "";
    const desc    = decodeXml(/<description[^>]*>([\s\S]*?)<\/description>/.exec(item)?.[1] || "");
    const pubDate = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(item)?.[1] || "";
    if (!title || title.length < 10) continue;
    const excerpt = (desc || title).substring(0, 400);
    items.push({
      sourceId, sourceName,
      originalTitle:   title,
      originalExcerpt: excerpt,
      originalUrl:     link,
      pubDate:         pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      category:        guessCategory(title + " " + excerpt),
    });
  }
  return items;
}

// ── 4. SEED FALLBACK ───────────────────────────────────────────────────────────
function getSeedArticles() {
  const now = Date.now();
  return [
    { originalTitle: "El precio de la vivienda sube un 8,2% en España en el último trimestre", originalExcerpt: "Los datos del INE confirman la tendencia alcista impulsada por la escasez de oferta y la demanda sostenida en grandes ciudades.", category: "Mercado" },
    { originalTitle: "Madrid y Barcelona concentran el 40% de la inversión inmobiliaria nacional", originalExcerpt: "Los inversores institucionales siguen apostando por los dos grandes mercados urbanos ante la falta de producto en otras plazas europeas.", category: "Inversión" },
    { originalTitle: "La contratación de oficinas en Madrid supera los 200.000 m² en el trimestre", originalExcerpt: "El mercado de oficinas recupera niveles prepandemia con demanda liderada por empresas tecnológicas y servicios financieros.", category: "Oficinas" },
    { originalTitle: "El Gobierno amplía las zonas tensionadas de alquiler a 12 nuevas ciudades", originalExcerpt: "El Ministerio de Vivienda limita las subidas al IPC en los nuevos municipios declarados zona tensionada.", category: "Regulación" },
    { originalTitle: "Neinor Homes lanza 1.200 nuevas viviendas en la Comunidad de Madrid", originalExcerpt: "La promotora acelera su expansión con nuevos proyectos en el corredor del Henares y el sur metropolitano.", category: "Residencial" },
    { originalTitle: "Merlin Properties dispara su beneficio un 23% gracias a oficinas y logística", originalExcerpt: "La SOCIMI mejora resultados apoyada en la revisión al alza de contratos de arrendamiento en activos prime.", category: "SOCIMIs" },
    { originalTitle: "El sector logístico capta 800 millones en inversión durante el primer semestre", originalExcerpt: "Las naves industriales y centros de distribución siguen siendo el activo más demandado por fondos internacionales.", category: "Logística" },
    { originalTitle: "Blackstone adquiere una cartera de 3.000 viviendas en alquiler por 450 millones", originalExcerpt: "El fondo refuerza su posición en el mercado español de build-to-rent con la mayor operación del año.", category: "Inversión" },
    { originalTitle: "Barcelona declara zona tensionada el 100% de su territorio municipal", originalExcerpt: "El Ayuntamiento aplica la ley de vivienda estatal para limitar los precios del alquiler en toda la ciudad.", category: "Regulación" },
    { originalTitle: "El proptech español capta 200 millones en financiación durante 2025", originalExcerpt: "Las startups tecnológicas del sector inmobiliario consolidan su crecimiento con nuevas rondas de inversión.", category: "Proptech" },
    { originalTitle: "Prologis inaugura su mayor parque logístico en España con 180.000 m² en Guadalajara", originalExcerpt: "La instalación con certificación LEED Platinum refuerza el corredor logístico Madrid-Aragón.", category: "Logística" },
    { originalTitle: "Los hoteles de lujo en Madrid y Barcelona baten récords de ocupación y tarifa media", originalExcerpt: "El sector hotelero prime cierra el trimestre con ocupaciones superiores al 85% y ADR por encima de 320 euros.", category: "Hotelero" },
  ].map((a, i) => ({
    ...a, sourceId: "seed", sourceName: "Built Digest",
    originalUrl: "", pubDate: new Date(now - i * 3600000).toISOString(),
  }));
}

// ── DEDUPLICAR ────────────────────────────────────────────────────────────────
function dedup(articles) {
  const seen = new Set();
  return articles.filter(a => {
    const key = a.originalTitle.toLowerCase().replace(/[^a-záéíóúñ]/g, "").substring(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── FUNCIÓN PRINCIPAL ─────────────────────────────────────────────────────────
async function scrapeAllSources() {
  console.log("[scraper] Iniciando scraping multi-fuente...");

  const [brainsre, gnews1, gnews2, gnews3, napi1, napi2] = await Promise.all([
    fetchBrainsre(),
    fetchGoogleNews("inmobiliario España vivienda"),
    fetchGoogleNews("inversión inmobiliaria España fondo"),
    fetchGoogleNews("hipoteca alquiler precio España"),
    fetchNewsAPI("vivienda España precio mercado"),
    fetchNewsAPI("inmobiliario inversión España"),
  ]);

  const all = [...brainsre, ...gnews1, ...gnews2, ...gnews3, ...napi1, ...napi2];
  const unique = dedup(all).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  console.log(`[scraper] Total: ${all.length} → ${unique.length} únicos (Brainsre:${brainsre.length} GNews:${gnews1.length+gnews2.length+gnews3.length} NewsAPI:${napi1.length+napi2.length})`);

  // Completar con seed si hay pocas noticias reales
  if (unique.length < 6) {
    console.log("[scraper] Pocas noticias en vivo, completando con seed");
    const seed = getSeedArticles();
    return dedup([...unique, ...seed]).slice(0, 12);
  }

  return unique.slice(0, 12);
}

module.exports = { scrapeAllSources };
