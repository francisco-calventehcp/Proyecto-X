// ─────────────────────────────────────────────────────────────
// DATA FETCHER — Datos del mercado inmobiliario desde el INE
// API pública del INE: gratis, sin API key
// ─────────────────────────────────────────────────────────────

const INE_BASE = "https://servicios.ine.es/wstempus/js/ES";

const INDICATORS = {
  compraventas: {
    label: "Compraventas de vivienda",
    unit: "viviendas",
    source: "INE (Transmisiones de Derechos de la Propiedad)",
    frequency: "monthly",
    url: `${INE_BASE}/DATOS_TABLA/6150?nult=14&tip=AM`,
    extract: (data) => {
      const series = data.filter(
        (s) => s.Nombre && s.Nombre.includes("Total") && s.Nombre.includes("viviendas")
          && !s.Nombre.includes("protegid") && !s.Nombre.includes("segunda") && !s.Nombre.includes("nueva")
      );
      const total = series.find((s) => s.Nombre.includes("Total") && !s.Nombre.includes("libre")) || series[0];
      if (!total || !total.Data) return [];
      return total.Data.map((d) => ({ date: ineDate(d.Fecha), value: d.Valor }));
    },
  },

  hipotecas: {
    label: "Hipotecas constituidas",
    unit: "hipotecas",
    source: "INE (Estadística de Hipotecas)",
    frequency: "monthly",
    url: `${INE_BASE}/DATOS_TABLA/3200?nult=14&tip=AM`,
    extract: (data) => {
      const vivienda = data.find(
        (s) => s.Nombre && s.Nombre.includes("Viviendas") && s.Nombre.includes("Número")
      );
      if (!vivienda || !vivienda.Data) return [];
      return vivienda.Data.map((d) => ({ date: ineDate(d.Fecha), value: d.Valor }));
    },
  },

  ipv: {
    label: "Índice de Precios de Vivienda",
    unit: "% interanual",
    source: "INE (IPV Base 2015)",
    frequency: "quarterly",
    url: `${INE_BASE}/DATOS_TABLA/25171?nult=8&tip=AM`,
    extract: (data) => {
      const general = data.find(
        (s) => s.Nombre && s.Nombre.includes("General") && s.Nombre.includes("Nacional") && s.Nombre.includes("anual")
      );
      if (!general || !general.Data) return [];
      return general.Data.map((d) => ({ date: ineDate(d.Fecha), value: d.Valor }));
    },
  },

  ipc_alquiler: {
    label: "IPC Alquiler de vivienda",
    unit: "% interanual",
    source: "INE (IPC - Alquiler de vivienda)",
    frequency: "monthly",
    url: `${INE_BASE}/DATOS_TABLA/2643?nult=14&tip=AM`,
    extract: (data) => {
      const variacion = data.find((s) => s.Nombre && s.Nombre.includes("anual"));
      if (!variacion || !variacion.Data) return [];
      return variacion.Data.map((d) => ({ date: ineDate(d.Fecha), value: d.Valor }));
    },
  },

  tipo_interes: {
    label: "Tipo de interés medio hipotecas",
    unit: "%",
    source: "INE (Estadística de Hipotecas)",
    frequency: "monthly",
    url: `${INE_BASE}/DATOS_TABLA/24457?nult=14&tip=AM`,
    extract: (data) => {
      const vivienda = data.find(
        (s) => s.Nombre && (s.Nombre.includes("Viviendas") || s.Nombre.includes("vivienda"))
      );
      if (!vivienda || !vivienda.Data) return [];
      return vivienda.Data.map((d) => ({ date: ineDate(d.Fecha), value: d.Valor }));
    },
  },
};

// ─── HELPERS ──────────────────────────────────────────────────

function ineDate(timestamp) {
  const d = new Date(timestamp);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatValue(value, unit) {
  if (value === null || value === undefined) return "—";
  if (unit === "%") return value.toFixed(2) + "%";
  if (unit === "% interanual") return (value > 0 ? "+" : "") + value.toFixed(1) + "%";
  if (value >= 1000) return Math.round(value).toLocaleString("es-ES");
  return value.toString();
}

// ─── FETCH INDIVIDUAL ─────────────────────────────────────────

async function fetchIndicator(key) {
  const indicator = INDICATORS[key];
  if (!indicator) return null;

  try {
    const res = await fetch(indicator.url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const raw = await res.json();
    const dataPoints = indicator.extract(Array.isArray(raw) ? raw : [raw]);
    if (!dataPoints || dataPoints.length === 0) return null;

    dataPoints.sort((a, b) => b.date.localeCompare(a.date));

    const latest  = dataPoints[0];
    const previous = dataPoints[1];
    const yearAgo = dataPoints.find((d) => {
      const [ly, lm] = latest.date.split("-").map(Number);
      const [dy, dm] = d.date.split("-").map(Number);
      return dy === ly - 1 && dm === lm;
    });

    let mom = null;
    if (latest && previous && previous.value !== 0) {
      mom = ((latest.value - previous.value) / Math.abs(previous.value)) * 100;
    }
    let yoy = null;
    if (latest && yearAgo && yearAgo.value !== 0) {
      yoy = ((latest.value - yearAgo.value) / Math.abs(yearAgo.value)) * 100;
    }

    return {
      key,
      label: indicator.label,
      unit: indicator.unit,
      source: indicator.source,
      frequency: indicator.frequency,
      latest: {
        date: latest.date,
        value: latest.value,
        formatted: formatValue(latest.value, indicator.unit),
      },
      previous: previous ? { date: previous.date, value: previous.value } : null,
      changes: {
        mom: mom !== null ? +mom.toFixed(1) : null,
        yoy: yoy !== null ? +yoy.toFixed(1) : null,
      },
      history: dataPoints.slice(0, 12).reverse(),
    };
  } catch (err) {
    console.error(`[data] ${key} error:`, err.message);
    return null;
  }
}

// ─── FETCH TODOS ──────────────────────────────────────────────

async function fetchAllIndicators() {
  const keys = Object.keys(INDICATORS);
  const results = {};

  await Promise.all(
    keys.map(async (key) => {
      const result = await fetchIndicator(key);
      if (result) results[key] = result;
    })
  );

  return {
    indicators: results,
    fetchedAt: new Date().toISOString(),
    count: Object.keys(results).length,
    available: keys.length,
  };
}

module.exports = { fetchAllIndicators, fetchIndicator, INDICATORS };
