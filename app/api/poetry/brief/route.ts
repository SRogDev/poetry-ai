// POST /api/poetry/brief — the full Emotion Engine generation endpoint.
// Monthly grant → roses spend-gate → intent → recipient + Supermemory
// context → generate + critic loop → persist dedication.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  runEmotionEngine,
  splitLines,
  type DedicationFormat,
  type RecipientProfile,
} from "@/lib/openrouter/emotion-engine";
import { ROSE_COSTS } from "@/lib/roses/balance";
import { withRoses } from "@/lib/roses/gate";
import {
  personTag,
  recall,
  remember,
  userTag,
} from "@/lib/supermemory/client";

const FORMATS = ["poem", "letter", "quote", "video", "slideshow", "song"] as const;

interface BriefBody {
  brief?: unknown;
  format?: unknown;
  recipientId?: unknown;
  emotionTarget?: unknown;
  intensity?: unknown;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: BriefBody;
  try {
    body = (await req.json()) as BriefBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const brief = typeof body.brief === "string" ? body.brief.trim() : "";
  const format = body.format as DedicationFormat;
  if (!brief || brief.length > 2000) {
    return NextResponse.json(
      { error: "brief_required", message: "Cuéntame qué quieres provocar." },
      { status: 400 },
    );
  }
  if (!FORMATS.includes(format)) {
    return NextResponse.json({ error: "invalid_format" }, { status: 400 });
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

  // Resolve the recipient (must belong to the user).
  let recipient: RecipientProfile = { name: "esa persona especial" };
  if (recipientId) {
    const { data, error } = await supabase
      .from("recipients")
      .select("id, name, nickname, relationship, notes")
      .eq("id", recipientId)
      .eq("user_id", user.id)
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: "recipient_not_found" },
        { status: 404 },
      );
    }
    recipient = {
      name: data.name,
      nickname: data.nickname,
      relationship: data.relationship,
      notes: data.notes,
    };
    // Supermemory: enrich with what we know about this person (never throws).
    recipient.memories = await recall({
      query: brief,
      containerTag: personTag(recipientId),
      limit: 5,
    });
  }

  const cost = ROSE_COSTS[format];

  let engine: Awaited<ReturnType<typeof runEmotionEngine>>;
  let balance: number;
  try {
    const gated = await withRoses(
      user.id,
      cost,
      `generate:${format}`,
      () =>
        runEmotionEngine({
          brief,
          recipient,
          format,
          emotionTarget,
          intensity,
        }),
    );
    engine = gated.result;
    balance = gated.balance;
  } catch (e) {
    if ((e as Error).name === "InsufficientRosesError") {
      return NextResponse.json(
        {
          error: "insufficient_roses",
          message: "No te quedan rosas suficientes. Vuelven gratis cada mes.",
          rosesBalance: (e as { balance?: number }).balance ?? 0,
        },
        { status: 402 },
      );
    }
    console.error("[poetry/brief] generation failed:", e);
    return NextResponse.json(
      {
        error: "generation_failed",
        message:
          "No pude crear tu dedicatoria ahora mismo. Inténtalo de nuevo.",
      },
      { status: 500 },
    );
  }

  const lines = splitLines(engine.output);

  // Persist the dedication.
  const { data: dedication, error: insertError } = await supabase
    .from("dedications")
    .insert({
      user_id: user.id,
      recipient_id: recipientId ?? null,
      format,
      emotion_target: emotionTarget ?? engine.intent.emotions.join(", "),
      brief,
      output: { text: engine.output, lines },
      roses_spent: cost,
    })
    .select("id")
    .single();

  if (insertError || !dedication) {
    console.error("[poetry/brief] persist failed:", insertError);
    // The roses were spent but the row failed — still return the content so
    // the user doesn't lose it; log for ops.
    return NextResponse.json(
      {
        dedicationId: null,
        intent: engine.intent,
        output: { text: engine.output, lines },
        score: engine.score,
        iterations: engine.iterations,
        rosesBalance: balance,
        warning: "persist_failed",
      },
      { status: 200 },
    );
  }

  // Remember for next time (fire-and-forget, never throws).
  void remember({
    content: `Dedicatoria (${format}) para ${recipient.name}: ${engine.intent.summary}. Emociones: ${engine.intent.emotions.join(", ")}. Ocasión: ${engine.intent.occasion ?? "ninguna"}.`,
    containerTag: recipientId ? personTag(recipientId) : userTag(user.id),
    metadata: { dedication_id: dedication.id, format },
  });

  return NextResponse.json({
    dedicationId: dedication.id,
    intent: engine.intent,
    output: { text: engine.output, lines },
    score: engine.score,
    iterations: engine.iterations,
    rosesBalance: balance,
  });
}
