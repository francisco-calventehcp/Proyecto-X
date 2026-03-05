// ─────────────────────────────────────────────────────────────────────────────
// DATA FETCHER — Indicadores económicos inmobiliarios
// Intenta obtener datos del INE. Si falla, usa datos verificados recientes.
// ─────────────────────────────────────────────────────────────────────────────

// Datos de fallback verificados manualmente (actualizados feb 2026)
const FALLBACK = {
  ipv: {
    key: "ipv",
    label: "Índice de Precios de Vivienda",
    unit: "% interanual",
    source: "INE · IPV Base 2015 · Q2 2025",
    latest: { date: "2025-06", value: 12.8, formatted: "+12.8%" },
    previous: { date: "2025-03", value: 12.7 },
    changes: { mom: 0.8, yoy: 58 },
    history: [
      { date: "2023-09", value: 4.2 },
      { date: "2023-12", value: 6.3 },
      { date: "2024-03", value: 7.8 },
      { date: "2024-06", value: 8.1 },
      { date: "2024-09", value: 11.3 },
      { date: "2024-12", value: 12.2 },
      { date: "2025-03", value: 12.7 },
      { date: "2025-06", value: 12.8 },
    ],
  },
  tipo_interes: {
    key: "tipo_interes",
    label: "Tipo de interés medio hipotecas",
    unit: "%",
    source: "INE · Estadística de Hipotecas · Nov 2025",
    latest: { date: "2025-11", value: 2.87, formatted: "2.87%" },
    previous: { date: "2025-10", value: 2.97 },
    changes: { mom: -3.4, yoy: -11.7 },
    history: [
      { date: "2025-04", value: 2.91 },
      { date: "2025-05", value: 2.99 },
      { date: "2025-06", value: 2.94 },
      { date: "2025-07", value: 2.89 },
      { date: "2025-08", value: 2.85 },
      { date: "2025-09", value: 2.81 },
      { date: "2025-10", value: 2.97 },
      { date: "2025-11", value: 2.87 },
    ],
  },
  hipotecas: {
    key: "hipotecas",
    label: "Hipotecas constituidas",
    unit: "operaciones",
    source: "INE · Estadística de Hipotecas · Nov 2025",
    latest: { date: "2025-11", value: 37841, formatted: "37.841" },
    previous: { date: "2025-10", value: 43319 },
    changes: { mom: -12.6, yoy: 17.4 },
    history: [
      { date: "2025-04", value: 42274 },
      { date: "2025-05", value: 41834 },
      { date: "2025-06", value: 45067 },
      { date: "2025-07", value: 33271 },
      { date: "2025-08", value: 46120 },
      { date: "2025-09", value: 52198 },
      { date: "2025-10", value: 43319 },
      { date: "2025-11", value: 37841 },
    ],
  },
};

// Intenta obtener datos reales del INE
async function tryFetchINE(ineId, format, nult = 14) {
  const url = `https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/${ineId}?nult=${nult}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "BuiltDigest/1.0" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`INE ${res.status}`);
  const data = await res.json();
  const rows = (data.Data || [])
    .map(d => ({
      date: (() => {
        try {
          const dt = new Date(typeof d.Fecha === "number" ? d.Fecha : parseInt(d.Fecha));
          return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
        } catch { return null; }
      })(),
      value: d.Valor,
    }))
    .filter(d => d.date && d.value !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (rows.length < 2) throw new Error("Sin datos suficientes");

  const latest  = rows[rows.length - 1];
  const prev    = rows[rows.length - 2];
  const yearAgo = rows.find(d => {
    const [ly, lm] = latest.date.split("-").map(Number);
    const [dy, dm] = d.date.split("-").map(Number);
    return dy === ly - 1 && dm === lm;
  }) || rows[0];

  return {
    latest: {
      date:      latest.date,
      value:     latest.value,
      formatted: format(latest.value),
    },
    previous: { date: prev.date, value: prev.value },
    changes: {
      mom: prev.value ? parseFloat(((latest.value - prev.value) / Math.abs(prev.value) * 100).toFixed(1)) : null,
      yoy: yearAgo.date !== latest.date
        ? parseFloat(((latest.value - yearAgo.value) / Math.abs(yearAgo.value) * 100).toFixed(1))
        : null,
    },
    history: rows.slice(-8),
  };
}

async function fetchAllIndicators() {
  const LIVE_SERIES = [
    { key: "ipv",          ineId: "25171", format: v => (v >= 0 ? "+" : "") + v.toFixed(1) + "%" },
    { key: "tipo_interes", ineId: "25156", format: v => v.toFixed(2) + "%" },
    { key: "hipotecas",    ineId: "25152", format: v => Math.round(v).toLocaleString("es-ES") },
  ];

  const indicators = {};
  let liveCount = 0;

  await Promise.all(
    LIVE_SERIES.map(async ({ key, ineId, format }) => {
      try {
        const live = await tryFetchINE(ineId, format);
        indicators[key] = { ...FALLBACK[key], ...live };
        liveCount++;
        console.log(`[data-fetcher] ✓ ${key} en vivo`);
      } catch (err) {
        console.warn(`[data-fetcher] ${key} fallback (${err.message})`);
        indicators[key] = FALLBACK[key];
      }
    })
  );

  console.log(`[data-fetcher] ${liveCount}/3 en vivo, ${3 - liveCount}/3 desde fallback`);

  return {
    indicators,
    fetchedAt: new Date().toISOString(),
    count:     Object.keys(indicators).length,
    available: 3,
    liveCount,
  };
}

module.exports = { fetchAllIndicators };
