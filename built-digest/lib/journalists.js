// ─────────────────────────────────────────────────────────────
// PERIODISTAS FICTICIOS
// Los nombres son anagramas de personas reales del sector
// ─────────────────────────────────────────────────────────────

const JOURNALISTS = [
  {
    name: "Borja Guiochea",
    initials: "BG",
    specialties: ["exclusivas", "inversión", "promoción"],
    bio: "Redactor jefe. Especializado en grandes operaciones corporativas.",
  },
  {
    name: "Leena Pérez",
    initials: "LP",
    specialties: ["mercado", "oficinas", "datos"],
    bio: "Analista de mercado. Experta en datos y tendencias.",
  },
  {
    name: "Valera Pausada",
    initials: "VP",
    specialties: ["regulación", "alquiler", "vivienda pública"],
    bio: "Especialista en política de vivienda y regulación.",
  },
  {
    name: "Paloma Regís",
    initials: "PR",
    specialties: ["comercial", "retail", "logística"],
    bio: "Cubre el sector comercial y logístico.",
  },
  {
    name: "Adonis Vega",
    initials: "AV",
    specialties: ["proptech", "tecnología", "data centers"],
    bio: "Especializado en innovación y proptech.",
  },
  {
    name: "Lorenzo Aduga",
    initials: "LA",
    specialties: ["residencial", "obra nueva", "urbanismo"],
    bio: "Cubre el segmento residencial y los nuevos desarrollos.",
  },
];

function assignJournalist(category) {
  const categoryMap = {
    exclusiva:         ["BG"],
    inversión:         ["BG", "AV"],
    promoción:         ["BG", "LA"],
    residencial:       ["LA", "VP"],
    oficinas:          ["LP", "PR"],
    mercado:           ["LP", "BG"],
    regulación:        ["VP"],
    alquiler:          ["VP", "LA"],
    proptech:          ["AV"],
    tecnología:        ["AV"],
    comercial:         ["PR"],
    logística:         ["PR"],
    "vivienda pública":["VP", "LA"],
    "data centers":    ["AV"],
    retail:            ["PR"],
    default:           ["BG", "LP", "LA"],
  };

  const cat = (category || "").toLowerCase();
  const candidates = categoryMap[cat] || categoryMap["default"];
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return JOURNALISTS.find((j) => j.initials === pick) || JOURNALISTS[0];
}

module.exports = { JOURNALISTS, assignJournalist };
