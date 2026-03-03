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
      id
