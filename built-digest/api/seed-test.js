const { saveNews } = require("../lib/storage");

module.exports = async function handler(req, res) {
  const secret = req.query.secret;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const testArticles = [
    {
      id: "test001",
      title: "El precio de la vivienda sube un 8% en Madrid en el primer trimestre",
      excerpt: "El mercado residencial madrileño mantiene su tendencia alcista con una demanda que supera a la oferta disponible.",
      body: "El mercado inmobiliario de Madrid continúa mostrando señales de fortaleza en el arranque del año. Según los últimos datos del Colegio de Registradores, el precio medio del metro cuadrado en la capital ha alcanzado los 4.200 euros, consolidando una subida del 8% respecto al mismo periodo del año anterior.\n\nLa escasez de oferta sigue siendo el principal motor de esta tendencia. Los promotores alertan de que la falta de suelo finalista en ubicaciones consolidadas limita la capacidad de respuesta del mercado ante una demanda que no cede.\n\nLos expertos prevén que esta dinámica se mantenga durante los próximos meses, especialmente en los distritos más demandados como Salamanca, Chamberí y Retiro.",
      category: "Mercado",
      journalist: "Leena Pérez",
      journalistInitials: "LP",
      publishedAt: new Date().toISOString(),
    },
    {
      id: "test002",
      title: "Blackstone adquiere una cartera de 1.200 viviendas en alquiler por 380 millones",
      excerpt: "El fondo estadounidense refuerza su apuesta por el residencial en alquiler en España con su mayor operación del año.",
      body: "Blackstone ha cerrado la adquisición de una cartera de 1.200 viviendas destinadas al alquiler en Madrid y Barcelona por un importe de 380 millones de euros. La operación, la mayor del fondo en España este año, refleja el creciente interés de los inversores institucionales por el segmento build-to-rent.\n\nLas viviendas adquiridas se distribuyen entre ambas ciudades y cuentan con una ocupación media superior al 95%. El fondo prevé invertir en la mejora y eficiencia energética de los inmuebles durante los próximos dos años.\n\nEsta operación confirma a España como uno de los mercados europeos más atractivos para la inversión en residencial en alquiler, con rentabilidades brutas que oscilan entre el 4% y el 5,5% en las principales ciudades.",
      category: "Inversión",
      journalist: "Borja Guiochea",
      journalistInitials: "BG",
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "test003",
      title: "La nueva ley de vivienda dispara los recursos judiciales de los propietarios",
      excerpt: "Las asociaciones de propietarios contabilizan más de 3.000 recursos desde la entrada en vigor de la norma.",
      body: "La aplicación de la Ley de Vivienda continúa generando conflictos jurídicos entre propietarios e inquilinos. Las principales asociaciones del sector contabilizan más de 3.000 recursos judiciales presentados desde la entrada en vigor de la norma, con especial concentración en Cataluña y el País Vasco, donde se han declarado zonas tensionadas.\n\nLos propietarios cuestionan especialmente los límites a la actualización de rentas y los plazos ampliados para los desahucios. Los tribunales están tardando entre 18 y 24 meses en resolver estos casos, según los datos del Consejo General del Poder Judicial.\n\nMientras tanto, varios estudios apuntan a que la oferta de vivienda en alquiler ha caído un 18% en las zonas declaradas tensionadas, agravando el problema de acceso que la norma pretendía resolver.",
      category: "Regulación",
      journalist: "Valera Pausada",
      journalistInitials: "VP",
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: "test004",
      title: "Los visados de obra nueva caen un 12% y amenazan el objetivo de 100.000 viviendas anuales",
      excerpt: "El sector promotor alerta de que los cuellos de botella administrativos y el encarecimiento de materiales frenan la producción.",
      body: "La producción de vivienda nueva en España acumula una caída del 12% en visados de obra nueva en los últimos doce meses, según los datos del Ministerio de Vivienda. La cifra aleja al sector del objetivo de 100.000 nuevas viviendas anuales que los expertos consideran necesario para equilibrar el mercado.\n\nLos promotores identifican tres factores principales detrás de este descenso: la lentitud de los trámites urbanísticos, que en algunas comunidades supera los cuatro años; el encarecimiento de los costes de construcción, que ha subido un 22% desde 2021; y la dificultad para encontrar financiación en un entorno de tipos al alza.\n\nComunidades como Madrid y Andalucía mantienen niveles de actividad superiores a la media, mientras que Cataluña y la Comunitat Valenciana registran los descensos más pronunciados.",
      category: "Residencial",
      journalist: "Lorenzo Aduga",
      journalistInitials: "LA",
      publishedAt: new Date(Date.now() - 10800000).toISOString(),
    },
    {
      id: "test005",
      title: "El coworking bate récords en Barcelona con 95.000 m² contratados en 2024",
      excerpt: "La demanda flexible de oficinas no da señales de ralentización y consolida a Barcelona como hub europeo del coworking.",
      body: "Barcelona ha cerrado 2024 con un récord histórico en contratación de espacios de coworking, alcanzando los 95.000 metros cuadrados absorbidos durante el ejercicio. La cifra supera en un 23% el máximo anterior y consolida a la ciudad condal como uno de los principales destinos europeos para el trabajo flexible.\n\nLas empresas tecnológicas y los nómadas digitales internacionales son los principales impulsores de esta demanda. Los operadores destacan que la ocupación media de sus centros supera el 88%, con listas de espera en las ubicaciones más demandadas del 22@ y el Eixample.\n\nOperadores como WeWork, IWG y Utopicus han anunciado la apertura de nuevos centros para 2025, sumando más de 40.000 metros cuadrados adicionales a la oferta barcelonesa.",
      category: "Oficinas",
      journalist: "Leena Pérez",
      journalistInitials: "LP",
      publishedAt: new Date(Date.now() - 14400000).toISOString(),
    },
    {
      id: "test006",
      title: "Prologis abre su mayor parque logístico en España con 180.000 m² en Guadalajara",
      excerpt: "La instalación, con certificación LEED Platinum, refuerza el corredor logístico Madrid-Aragón como el más activo de la Península.",
      body: "Prologis ha inaugurado su mayor instalación logística en España, un parque de 180.000 metros cuadrados ubicado en el municipio de Cabanillas del Campo, en Guadalajara. La inversión asciende a 120 millones de euros y la instalación cuenta con certificación LEED Platinum, convirtiéndose en una de las más sostenibles del sector en Europa.\n\nEl parque, que ya tiene el 70% de su superficie comprometida con tres operadores logísticos de primer nivel, generará más de 800 empleos directos en la zona. La elección de Guadalajara responde a su posición estratégica en el corredor Madrid-Zaragoza-Barcelona y a la disponibilidad de suelo finalista.\n\nEsta apertura refuerza la posición de España como destino prioritario para la inversión logística en el sur de Europa, con una demanda que supera estructuralmente a la oferta disponible.",
      category: "Logística",
      journalist: "Paloma Regís",
      journalistInitials: "PR",
      publishedAt: new Date(Date.now() - 18000000).toISOString(),
    },
  ];

  try {
    const result = await saveNews(testArticles);
    return res.status(200).json({
      status: "success",
      message: `${result.added} noticias de prueba cargadas`,
      total: result.total,
    });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};
```
