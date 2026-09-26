// POST /api/poetry/image — romantic background image for videos/cards.
// No extra roses (covered by the generation cost).
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateImage } from "@/lib/openrouter/client";

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
  if (!prompt || prompt.length > 1000) {
    return NextResponse.json({ error: "prompt_required" }, { status: 400 });
  }

  try {
    // Romantic, vertical, no text — text is composited client-side.
    const image = await generateImage(
      `Romantic cinematic vertical background, 9:16, dreamy soft light, roses and warm bokeh, painterly, no text, no words, no letters: ${prompt}`,
    );
    return NextResponse.json({ image });
  } catch (e) {
    console.error("[poetry/image] failed:", e);
    return NextResponse.json(
      {
        error: "image_failed",
        message: "No pude generar la imagen ahora mismo.",
      },
      { status: 500 },
    );
  }
}
