// POST /api/poetry/music — AI instrumental theme (~30s) for videos/slideshows.
// Premium endpoint: no roses, but may fail if the music model errors —
// callers must degrade gracefully (video works with bundled tracks or silence).
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMusic } from "@/lib/openrouter/client";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { prompt?: unknown };
  try {
    body = (await req.json()) as { prompt?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > 500) {
    return NextResponse.json({ error: "prompt_required" }, { status: 400 });
  }

  try {
    const audio = await generateMusic(
      `Instrumental romántico, piano suave con cuerdas, tempo lento, 30 segundos, inspirado en: ${prompt}`,
    );
    return NextResponse.json({ audio, durationSec: 30 });
  } catch (e) {
    console.error("[poetry/music] failed:", e);
    return NextResponse.json(
      {
        error: "music_failed",
        message:
          "No pude componer el tema ahora mismo. Puedes usar una pista de la biblioteca.",
      },
      { status: 500 },
    );
  }
}
