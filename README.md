# 🌹 Poetry AI

**Detalles emocionales para quien amas.** Una IA a la que le dices qué quieres provocar — *"quiero que llore de felicidad"*, *"quiero reconciliarme con mi papá"* — y ella crea el contenido emocional: poemas, cartas de amor, videos dedicados con narración… y **Lovis**: detalles interactivos donde el link compartido *es* el regalo.

Solo LatAm, solo español. Primero Gen Z móvil; el romance es la cuña, la familia y la amistad son la expansión.

> Open source (MIT). v1 built and live in this repo: Emotion Engine, all content formats, recipients + @nicknames, roses economy, share pages.

## ✨ Conceptos

- **Emotion Engine** — el corazón del producto: *prompt engineering*, no modelos propios. Del brief se extrae la intención emocional, se cruza con el perfil psicológico del destinatario, se genera con técnicas emocionales concretas y un **crítico emocional** itera hasta que el texto realmente provoca la emoción objetivo. Todo vía [OpenRouter](https://openrouter.ai).
- **Lovis** — artefactos de dedicatoria creados por usuarios: describes la idea en el chat (*"un cielo estrellado donde cada estrella es un recuerdo"*), la IA genera el detalle interactivo, lo publicas y queda en una galería comunitaria donde todos pueden usarlo y remixearlo. *"Detalles que se sienten."*
- **Rosas** 🌹 — la moneda: cada generación cuesta rosas; las suscripciones y recargas van por [Polar](https://polar.sh) (detrás de un flag hasta verificar payouts).
- **El link es el regalo** — cada dedicatoria tiene su página pública `/s/[id]` optimizada para previsualizar en WhatsApp.

## 🧱 Stack

- **Next.js 16** (App Router, full stack) + TypeScript + Tailwind
- **Supabase** — Auth, Postgres y Storage. El schema vive en [`db.sql`](./db.sql) (fuente de verdad, se aplica en el SQL editor)
- **Supermemory** — memoria de conversaciones y de personas
- **OpenRouter** — toda la IA (texto, imagen, video, voz)
- **Polar** — billing (flaggeado)
- **Serwist** — PWA instalable (service worker); camino a Play Store vía TWA

## 🚀 Cómo correrlo

```bash
# 1. Clona e instala
git clone https://github.com/SRogDev/poetry-ai.git
cd poetry-ai
npm install

# 2. Crea un proyecto en Supabase y pega db.sql en el SQL editor
#    https://supabase.com/dashboard → New project → SQL Editor → pega db.sql → Run

# 3. Configura el entorno
cp .env.example .env.local
# llena NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
# OPENROUTER_API_KEY, SUPERMEMORY_API_KEY (Polar cuando se verifique)

# 4. Corre
npm run dev
```

## 📁 Estructura

```
poetry-ai/
├── db.sql                  # schema completo (tablas + RLS) — fuente de verdad
├── app/
│   ├── (marketing)/        # landing en español
│   ├── (app)/              # chat, recipients, lovis (galería + estudio)
│   ├── s/[id]/             # páginas públicas de dedicatorias
│   └── api/                # webhooks (Polar), generación, OG images
├── components/lovis/       # renderer sandboxed de Lovis (iframe)
├── lib/
│   ├── openrouter/         # cliente + prompts del Emotion Engine
│   ├── supermemory/        # memoria de conversaciones/personas
│   ├── lovis/              # contrato de slots, sanitización
│   ├── roses/              # balance y spend-gate
│   └── share/              # OG images, watermark, presets de export
└── public/music/           # tracks libres de derechos (curaduría)
```

## 🗺️ Roadmap

- **Fase 0** (este scaffold): base Supabase, `db.sql`, CI, landing, PWA-ready
- **Fase 1**: Auth, recipients, chat + Supermemory, Emotion Engine v1 (poema + carta), rosas, video de frase gratis
- **Fase 2**: compositor de video en el cliente, share pages + OG, watermark, **Lovis studio + galería**
- **Fase 3**: billing Polar, suscripciones, recargas, empaquetado TWA → Play Store
- **Fase 4**: canciones, fondos de video generativo, SEO, campañas estacionales, recompensas a creadores de Lovis

## 🤝 Contribuir

PRs bienvenidos. Lee el plan del producto (`~/workspace/plans/poetry-ai/PLAN.md`) antes de proponer cambios de producto.

---

*Basado en el [Next.js + Supabase Starter](https://github.com/vercel/next.js/tree/canary/examples/with-supabase).*
