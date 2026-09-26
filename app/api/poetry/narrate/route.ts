// POST /api/poetry/narrate — Spanish voiceover for a generated text.
// No extra roses (covered by the video/song generation cost).
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tts, DEFAULT_TTS_VOICE } from "@/lib/openrouter/client";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { text?: unknown; voice?: unknown };
  try {
    body = (await req.json()) as { text?: unknown; voice?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 4000) {
    return NextResponse.json({ error: "text_required" }, { status: 400 });
  }
  const voice =
    typeof body.voice === "string" && body.voice ? body.voice : DEFAULT_TTS_VOICE;

  try {
    const audio = await tts(text, { voice });
    return NextResponse.json({ audio });
  } catch (e) {
    console.error("[poetry/narrate] tts failed:", e);
    return NextResponse.json(
      {
        error: "tts_failed",
        message:
          "No pude generar la narración ahora mismo. Puedes crear el video sin voz.",
      },
      { status: 500 },
    );
  }
}
