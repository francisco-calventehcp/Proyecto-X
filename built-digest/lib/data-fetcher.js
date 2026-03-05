// ─────────────────────────────────────────────────────────────────────────────
// DATA FETCHER — Indicadores económicos inmobiliarios del INE
// Solo usamos series verificadas que responden correctamente
// ─────────────────────────────────────────────────────────────────────────────

async function fetchSeries(ineId, nult = 14) {
  const url = `https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/${ineId}?nult=${nult}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "BuiltDigest/1.0" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`INE ${res.status}`);
  const data = await res.json();
  return (data.Data || [])
    .map(d => ({
      date:  parseDate(d.Fecha),
      value: d.Valor,
    }))
    .filter(d => d.date && d.value !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function parseDate(raw) {
  try {
    const d = new Date(typeof raw === "number" ? raw : parseInt(raw));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  } catch { return null; }
}

function calcChanges(sorted) {
  const latest  = sorted[sorted.length - 1];
  const prev    = sorted[sorted.length - 2];
  const yearAgo = sorted.find(d => {
    const [ly, lm] = latest.date.split("-").map(Number);
    const [dy, dm] = d.date.split("-").map(Number);
    return dy === ly - 1 && dm === lm;
  }) || sorted[0];

  const mom = prev?.value
    ? parseFloat(((latest.value - prev.value) / Math.abs(prev.value) * 100).toFixed(1))
    : null;
  const yoy = yearAgo?.value && yearAgo.date !== latest.date
    ? parseFloat(((latest.value - yearAgo.value) / Math.abs(yearAgo.value) * 100).toFixed(1))
    : null;

  return { mom, yoy };
}

async function fetchAllIndicators() {
  // Series INE verificadas y funcionales
  const SERIES = [
    {
      key: "ipv",
      label: "Índice de Precios de Vivienda",
      unit: "% interanual",
      source: "INE · IPV Base 2015",
      ineId: "25171",
      format: v => (v >= 0 ? "+" : "") + v.toFixed(1) + "%",
    },
    {
      key: "tipo_interes",
      label: "Tipo de interés medio hipotecas",
      unit: "%",
      source: "INE · Estadística de Hipotecas",
      ineId: "25156",
      format: v => v.toFixed(2) + "%",
    },
    {
      key: "hipotecas",
      label: "Hipotecas constituidas",
      unit: "operaciones",
      source: "INE · Estadística de Hipotecas",
      ineId: "25152",
      format: v => Math.round(v).toLocaleString("es-ES"),
    },
  ];

  const indicators = {};
  let available = 0;

  await Promise.all(
    SERIES.map(async (s) => {
      try {
        const sorted = await fetchSeries(s.ineId);
        if (!sorted.length) return;

        const latest  = sorted[sorted.length - 1];
        const prev    = sorted[sorted.length - 2] || null;
        const changes = calcChanges(sorted);
        const history = sorted.slice(-8);

        indicators[s.key] = {
          key:       s.key,
          label:     s.label,
          unit:      s.unit,
          source:    s.source,
          latest: {
            date:      latest.date,
            value:     latest.value,
            formatted: s.format(latest.value),
          },
          previous: prev ? { date: prev.date, value: prev.value } : null,
          changes,
          history,
        };
        available++;
      } catch (err) {
        console.error(`[data-fetcher] Error en ${s.key}:`, err.message);
      }
    })
  );

  console.log(`[data-fetcher] ${available}/${SERIES.length} indicadores OK`);

  return {
    indicators,
    fetchedAt: new Date().toISOString(),
    count:     available,
    available: SERIES.length,
  };
}

module.exports = { fetchAllIndicators };
