// POST /api/poetry/song — AI love "song": generated lyrics + AI instrumental
// theme + optional narration. 15 roses.
// Honest label: "Tema musical IA" — OpenRouter has no vocal-singing model, so
// the song is an instrumental theme composed for the brief plus the recited
// lyrics, not a sung performance.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  runEmotionEngine,
  type DedicationFormat,
  type RecipientProfile,
} from "@/lib/openrouter/emotion-engine";
import { ROSE_COSTS } from "@/lib/roses/balance";
import { withRoses } from "@/lib/roses/gate";
import { generateMusic, tts } from "@/lib/openrouter/client";
import {
  personTag,
  recall,
  remember,
  userTag,
} from "@/lib/supermemory/client";

const COST = ROSE_COSTS.song;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    brief?: unknown;
    recipientId?: unknown;
    emotionTarget?: unknown;
    intensity?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const brief = typeof body.brief === "string" ? body.brief.trim() : "";
  if (!brief || brief.length > 2000) {
    return NextResponse.json({ error: "brief_required" }, { status: 400 });
  }
  const intensity =
    body.intensity === 1 || body.intensity === 2 || body.intensity === 3
      ? body.intensity
      : undefined;
  const emotionTarget =
    typeof body.emotionTarget === "string" && body.emotionTarget.trim()
      ? body.emotionTarget.trim().slice(0, 200)
      : undefined;
  const recipientId =
    typeof body.recipientId === "string" ? body.recipientId : undefined;

  let recipient: RecipientProfile = { name: "esa persona especial" };
  if (recipientId) {
    const { data, error } = await supabase
      .from("recipients")
      .select("id, name, nickname, relationship, notes")
      .eq("id", recipientId)
      .eq("user_id", user.id)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "recipient_not_found" }, { status: 404 });
    }
    recipient = {
      name: data.name,
      nickname: data.nickname,
      relationship: data.relationship,
      notes: data.notes,
      memories: await recall({
        query: brief,
        containerTag: personTag(recipientId),
        limit: 5,
      }),
    };
  }

  try {
    const gated = await withRoses(user.id, COST, "generate:song", async () => {
      const engine = await runEmotionEngine({
        brief,
        recipient,
        format: "song" as DedicationFormat,
        emotionTarget,
        intensity,
      });
      // Compose the instrumental theme for the same emotion target.
      let music: string | null = null;
      try {
        music = await generateMusic(
          `Tema romántico para una canción de amor. ${engine.intent.summary || brief}. Emociones: ${engine.intent.emotions.join(", ")}.`,
        );
      } catch (e) {
        console.warn("[poetry/song] music failed, continuing with lyrics:", e);
      }
      // Recited lyrics (voiceover) — optional; the instrumental is the song.
      let narration: string | null = null;
      try {
        narration = await tts(engine.output.slice(0, 2000));
      } catch (e) {
        console.warn("[poetry/song] narration failed:", e);
      }
      return { engine, music, narration };
    });

    const { engine, music, narration } = gated.result;

    const { data: dedication, error: insertError } = await supabase
      .from("dedications")
      .insert({
        user_id: user.id,
        recipient_id: recipientId ?? null,
        format: "song",
        emotion_target: emotionTarget ?? engine.intent.emotions.join(", "),
        brief,
        output: { text: engine.output, music: Boolean(music) },
        roses_spent: COST,
      })
      .select("id")
      .single();

    if (insertError) console.error("[poetry/song] persist failed:", insertError);

    void remember({
      content: `Canción IA para ${recipient.name}: ${engine.intent.summary}. Emociones: ${engine.intent.emotions.join(", ")}.`,
      containerTag: recipientId ? personTag(recipientId) : userTag(user.id),
      metadata: { format: "song" },
    });

    return NextResponse.json({
      dedicationId: dedication?.id ?? null,
      lyrics: engine.output,
      music,
      narration,
      score: engine.score,
      iterations: engine.iterations,
      rosesBalance: gated.balance,
    });
  } catch (e) {
    if ((e as Error).name === "InsufficientRosesError") {
      return NextResponse.json(
        {
          error: "insufficient_roses",
          message: "No te quedan rosas suficientes.",
          rosesBalance: (e as { balance?: number }).balance ?? 0,
        },
        { status: 402 },
      );
    }
    console.error("[poetry/song] failed:", e);
    return NextResponse.json(
      { error: "generation_failed", message: "No pude crear tu canción." },
      { status: 500 },
    );
  }
}
