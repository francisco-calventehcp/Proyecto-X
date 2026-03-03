# Built Digest — Portal automático de noticias inmobiliarias

**100% gratuito. Se actualiza solo cada día.**

---

## ¿Cómo funciona?

```
Cada día a las 7:00 AM:
  1. Entra a EjePrime, Idealista News y Brainsre
  2. Extrae los titulares y extractos
  3. Los reescribe con IA (Groq / Llama 3) — GRATIS
  4. Los guarda en la base de datos
  5. La web los muestra automáticamente
```

---

## Coste mensual: 0€

| Servicio        | Plan      | Coste  |
|-----------------|-----------|--------|
| Vercel          | Hobby     | Gratis |
| Vercel KV (DB)  | Free tier | Gratis |
| Groq API (IA)   | Free tier | Gratis |
| INE API (datos) | Pública   | Gratis |

---

## Setup: 4 pasos

### 1. Obtén tu API key de Groq (gratis)
→ https://console.groq.com → Sign up → API Keys → Create key

### 2. Sube esto a GitHub
Crea un repositorio y sube todos estos archivos manteniendo la estructura de carpetas.

### 3. Despliega en Vercel
→ https://vercel.com → Add New Project → importa tu repo de GitHub
→ Storage → Create → KV → conecta al proyecto

### 4. Añade las variables de entorno en Vercel
Settings → Environment Variables:

| Variable       | Valor                        |
|----------------|------------------------------|
| GROQ_API_KEY   | gsk_... (tu key de Groq)     |
| CRON_SECRET    | cualquier string largo       |

### 5. Carga el contenido inicial (una sola vez)
```bash
npm install
npx vercel env pull .env.local
npm run seed
```

---

## Estructura de archivos

```
built-digest/
├── api/
│   ├── scrape.js      # Cron diario: scraping + IA + guardado
│   ├── news.js        # API: sirve noticias en JSON
│   └── data.js        # API: datos del INE en JSON
├── lib/
│   ├── scraper.js     # Extrae noticias de los portales
│   ├── rewriter.js    # Reescribe con Groq (Llama 3)
│   ├── journalists.js # Periodistas ficticios
│   ├── storage.js     # Lee/escribe en Vercel KV
│   └── data-fetcher.js# Datos económicos del INE
├── public/
│   └── index.html     # La web que ve el usuario
├── scripts/
│   └── seed.js        # Carga inicial (ejecutar 1 vez)
├── .env.example       # Plantilla de variables de entorno
├── package.json
└── vercel.json        # Config Vercel + cron 7AM
```

---

## Fuentes de noticias

- **EjePrime** — RSS
- **Idealista News** — RSS  
- **Brainsre News** — HTML scraping

## Datos de mercado (INE)

Se muestran automáticamente en la sección "Termómetro del mercado":
compraventas, hipotecas, IPV, IPC alquiler, tipo de interés.
