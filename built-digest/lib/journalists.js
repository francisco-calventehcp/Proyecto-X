const JOURNALISTS = [
  { name: "Carlos Mendoza",    initials: "CM", specialties: ["inversión", "socimis"],      bio: "Especialista en grandes operaciones corporativas y fondos de inversión." },
  { name: "Elena Vázquez",     initials: "EV", specialties: ["mercado", "datos"],           bio: "Analista de mercado. Experta en tendencias y precios residenciales." },
  { name: "Javier Pardo",      initials: "JP", specialties: ["regulación", "alquiler"],    bio: "Especialista en política de vivienda y normativa urbanística." },
  { name: "Sofía Herrera",     initials: "SH", specialties: ["comercial", "logística"],    bio: "Cubre el sector logístico e inmuebles comerciales." },
  { name: "Marcos Iglesias",   initials: "MI", specialties: ["proptech", "tecnología"],    bio: "Especializado en innovación tecnológica aplicada al sector inmobiliario." },
  { name: "Ana Castellano",    initials: "AC", specialties: ["residencial", "obra nueva"], bio: "Redactora de obra nueva y desarrollo urbanístico." },
  { name: "Pablo Serrano",     initials: "PS", specialties: ["hotelero", "inversión"],     bio: "Cubre el segmento hotelero y activos alternativos." },
  { name: "Laura Montero",     initials: "LM", specialties: ["oficinas", "mercado"],       bio: "Especialista en mercado de oficinas y flex space." },
  { name: "Ignacio Fuentes",   initials: "IF", specialties: ["socimis", "bolsa"],          bio: "Sigue la actualidad de las SOCIMIs y el mercado de capitales." },
  { name: "Marta Delgado",     initials: "MD", specialties: ["residencial", "alquiler"],   bio: "Redactora de vivienda en alquiler y acceso a la vivienda." },
  { name: "Rodrigo Alameda",   initials: "RA", specialties: ["logística", "industrial"],   bio: "Especializado en activos logísticos e industriales." },
  { name: "Cristina Llorente", initials: "CL", specialties: ["proptech", "sostenibilidad"],bio: "Cubre innovación, ESG y digitalización del sector." },
];

function assignJournalist(category) {
  const categoryMap = {
    inversión:      ["CM", "PS"],
    residencial:    ["AC", "MD"],
    oficinas:       ["LM", "EV"],
    mercado:        ["EV", "LM"],
    regulación:     ["JP", "MD"],
    alquiler:       ["JP", "MD"],
    logística:      ["SH", "RA"],
    hotelero:       ["PS", "CM"],
    comercial:      ["SH", "RA"],
    socimis:        ["IF", "CM"],
    proptech:       ["MI", "CL"],
    tecnología:     ["MI", "CL"],
    default:        ["CM", "EV", "AC", "LM"],
  };

  const cat = (category || "").toLowerCase();
  const candidates = categoryMap[cat] || categoryMap["default"];
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return JOURNALISTS.find(j => j.initials === pick) || JOURNALISTS[Math.floor(Math.random() * JOURNALISTS.length)];
}

module.exports = { JOURNALISTS, assignJournalist };
