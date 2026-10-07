# Poetry AI 🌹

**Emotional dedications for someone you love.** Tell the AI what you want to provoke — *"quiero que llore de felicidad"*, *"quiero reconciliarme con mi papá"* — and it creates the emotional content: poems, love letters, narrated poem videos, photo slideshows, AI love songs, and **Lovis**: interactive dedication experiences where the share link IS the gift.

Spanish-only, LatAm-only, Gen-Z-first, mobile-first. Romance is the wedge; family and friendship are the expansion.

## Concepts

- **Emotion Engine** — the heart of the product: intent extraction → recipient psychology → targeted generation → emotion critic loop → format adaptation. Prompt engineering over cheap OpenRouter models, not own models.
- **Lovis** — user-created dedication artifacts (*"a starry sky where each star is a memory"*): the AI generates the interactive piece, you publish it, and it lives in a public gallery where others can remix it.
- **Roses** 🌹 — the credit currency: every generation costs roses; subscriptions and top-ups via Polar (behind a flag until payouts are verified).
- **Recipients** — via @nickname; every dedication gets a public `/s/[id]` page optimized for WhatsApp preview.

## Status

- **v1 built and pushed (2026-09-26, `main` @ `21187d5`):** all formats, recipients, Roses ledger + spend-gate RPCs, share pages + OG images, Polar behind `POLAR_ENABLED=false`.
- **Verified:** 106 vitest green, tsc/eslint clean, 35/35 pages build. AI paths mock-verified (real keys not yet added).
- **Blocked on setup:** Supabase project + apply `db.sql`, env vars (`OPENROUTER_API_KEY`), Polar later.

## Stack

Next.js 16.4 (App Router, full stack) + TypeScript + Tailwind · Supabase (Auth, Postgres, Storage + RLS) · Supermemory (conversation + people memory) · OpenRouter (text, image, video, voice) · Polar (billing, flagged) · Serwist (installable PWA)

## Quickstart

```bash
git clone https://github.com/SRogDev/poetry-ai.git
cd poetry-ai
npm install

# 1. Create a Supabase project, paste db.sql in the SQL editor and run it
# 2. cp .env.example .env.local and fill in:
#    NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
#    OPENROUTER_API_KEY, SUPERMEMORY_API_KEY (Polar when verified)
npm run dev
```

## Structure

```
poetry-ai/
├── db.sql            # full schema (tables + RLS) — source of truth
├── app/              # routes: chat, recipients, lovis, s/[id], api/
├── components/       # UI incl. sandboxed Lovis renderer (iframe)
├── lib/              # openrouter/ (Emotion Engine), supermemory/,
│                     # lovis/ (slots, sanitization), roses/ (ledger),
│                     # share/ (OG images, watermark, export presets)
└── public/music/     # royalty-free track curation
```

## License

MIT — see [LICENSE](LICENSE).
