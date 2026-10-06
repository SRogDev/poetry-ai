# poetry-ai — Project Brief

> Full project context in one file. Hand this to ANOTHER AI (GPT, etc.) for planning
> and ideation, then bring the refined specs back. Keep this file accurate — it is the handoff doc.
> For the current timeline see `STATUS.md`. For how to work in this repo see `AGENTS.md`.

## One-liner
Poetry AI is a LatAm-only, Spanish-only, Gen Z-first AI app that generates emotional content dedicated to someone and shared via WhatsApp.

## Problem & audience
Young Latin Americans express affection through shareable digital content, but existing tools are generic and not built for the dedication-as-gift ritual.

## Product (what it is / is not)
Romance wedge (expands to family/friendship): the Emotion Engine (intent extraction → recipient psychology → targeted generation → emotion critic loop → format adaptation) over cheap OpenRouter models. Formats: narrated poem videos, photo slideshows, AI love songs, love letters, interactive dedication experiences where the share link IS the gift. Recipients via @nickname. Lovis community (user-created dedication artifacts, public gallery, remixable).

## Key decisions (locked)
- Spanish-only, LatAm-only, Gen Z-first. Brand: red-pink (#DC2626 → #EC4899). Mobile-first PWA.
- License: MIT. Public repo.
- Roses credit currency: Polar subscriptions; in-app goods use Google Play Billing (not Polar).
- AI mocked with an OpenRouter seam in MVP — Roger adds the key later.
- Client-side video compositing; Supabase Auth + Postgres + Storage with RLS.

## Stack
Next.js full-stack, OpenRouter, Supabase (Auth + Postgres + Storage, RLS), Supermemory.

## Business model
Roses credits (Polar subscriptions); in-app goods via Google Play Billing. Romance wedge → family/friendship expansion.

## Open questions
- Live Supabase + OpenRouter wiring (blocked on Roger).
- Emotion Engine quality bar: what makes a dedication feel genuinely moving vs generic.
