// ─────────────────────────────────────────────────────────────────────────────
// DATA FETCHER — Indicadores económicos del mercado inmobiliario español
// Fuente: API JSON del INE (pública, sin API key)
// ─────────────────────────────────────────────────────────────────────────────

const INDICATORS = {
  // Índice de Precios de Vivienda (IPV) — trimestral
  ipv: {
    key:       "ipv",
    label:     "Índice de Precios de Vivienda",
    unit:      "% interanual",
    source:    "INE (IPV Base 2015)",
    frequency: "quarterly",
    ineId:     "25171", // IPV general
    transform: v => v,
  },

  // Tipo de interés medio de hipotecas
  tipo_interes: {
    key:       "tipo_interes",
    label:     "Tipo de interés medio hipotecas",
    unit:      "%",
    source:    "INE (Estadística de Hipotecas)",
    frequency: "monthly",
    ineId:     "25156",
    transform: v => v,
  },

  // Hipotecas constituidas sobre viviendas
  hipotecas: {
    key:       "hipotecas",
    label:     "Hipotecas constituidas",
    unit:      "hipotecas",
    source:    "INE (Estadística de Hipotecas)",
    frequency: "monthly",
    ineId:     "25152",
    transform: v => v,
  },

  // Compraventas de viviendas
  compraventas: {
    key:       "compraventas",
    label:     "Compraventas de viviendas",
    unit:      "operaciones",
    source:    "INE (Estadística de Transmisiones de Derechos de la Propiedad)",
    frequency: "monthly",
    ineId:     "25316",
    transform: v => v,
  },

  // Visados de obra nueva (viviendas)
  visados: {
    key:       "visados",
    label:     "Visados de obra nueva",
    unit:      "viviendas",
    source:    "Ministerio de Vivienda (a través de INE)",
    frequency: "monthly",
    ineId:     "26159",
    transform: v => v,
  },
};

// Formatea el valor según unidad
function formatValue(value, unit, key) {
  if (value === null || value === undefined) return "—";
  if (key === "ipv") return (value >= 0 ? "+" : "") + value.toFixed(1) + "%";
  if (key === "tipo_interes") return value.toFixed(2) + "%";
  if (key === "compraventas" || key === "hipotecas" || key === "visados") {
    return Math.round(value).toLocaleString("es-ES");
  }
  return value.toLocaleString("es-ES");
}

// Obtiene los últimos N datos de una serie INE
async function fetchINESeries(ineId, nPeriods = 12) {
  const url = `https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/${ineId}?nult=${nPeriods}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "BuiltDigest/1.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`INE API error ${res.status} for series ${ineId}`);
  const data = await res.json();
  return data.Data || [];
}

// Convierte fecha INE a string YYYY-MM
function parseINEDate(ineDate) {
  if (!ineDate) return null;
  // El campo Fecha es un timestamp en milisegundos o string
  try {
    const d = new Date(typeof ineDate === "number" ? ineDate : parseInt(ineDate));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  } catch {
    return null;
  }
}

// Procesa una serie y devuelve el indicador formateado
async function processIndicator(config) {
  try {
    const raw = await fetchINESeries(config.ineId, 14);
    if (!raw.length) throw new Error("Sin datos");

    // Ordenar por fecha ascendente
    const sorted = raw
      .map(d => ({ date: parseINEDate(d.Fecha), value: d.Valor }))
      .filter(d => d.date && d.value !== null)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (!sorted.length) throw new Error("Sin datos procesados");

    const latest  = sorted[sorted.length - 1];
    const prev    = sorted[sorted.length - 2] || null;
    const yearAgo = sorted.find(d => {
      const [ly, lm] = latest.date.split("-").map(Number);
      const [dy, dm] = d.date.split("-").map(Number);
      return dy === ly - 1 && dm === lm;
    }) || sorted[0];

    // Cambio mensual
    const mom = prev && prev.value
      ? parseFloat(((latest.value - prev.value) / Math.abs(prev.value) * 100).toFixed(1))
      : null;

    // Cambio interanual
    const yoy = yearAgo && yearAgo.value && yearAgo.date !== latest.date
      ? parseFloat(((latest.value - yearAgo.value) / Math.abs(yearAgo.value) * 100).toFixed(1))
      : null;

    // Historial para sparkline (últimos 8)
    const history = sorted.slice(-8).map(d => ({
      date:  d.date,
      value: d.value,
    }));

    return {
      key:       config.key,
      label:     config.label,
      unit:      config.unit,
      source:    config.source,
      frequency: config.frequency,
      latest: {
        date:      latest.date,
        value:     latest.value,
        formatted: formatValue(latest.value, config.unit, config.key),
      },
      previous: prev ? {
        date:  prev.date,
        value: prev.value,
      } : null,
      changes: { mom, yoy },
      history,
    };

  } catch (err) {
    console.error(`[data-fetcher] Error en ${config.key} (${config.ineId}):`, err.message);
    return null;
  }
}

// Función principal — obtiene todos los indicadores en paralelo
async function fetchAllIndicators() {
  const keys = Object.keys(INDICATORS);

  const results = await Promise.allSettled(
    keys.map(k => processIndicator(INDICATORS[k]))
  );

  const indicators = {};
  let available = 0;

  results.forEach((r, i) => {
    const key = keys[i];
    if (r.status === "fulfilled" && r.value) {
      indicators[key] = r.value;
      available++;
    } else {
      console.warn(`[data-fetcher] ${key} no disponible`);
    }
  });

  console.log(`[data-fetcher] ${available}/${keys.length} indicadores obtenidos`);

  return {
    indicators,
    fetchedAt: new Date().toISOString(),
    count:     available,
    available: keys.length,
  };
}

module.exports = { fetchAllIndicators };
