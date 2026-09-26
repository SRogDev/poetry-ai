// Emotion Engine — the pipeline: brief → intent → generate → critic loop.
// Plain prompt chaining in server code (no LangGraph).
// `chatFn` is injectable so the whole pipeline is unit-testable with mocks.

import { chat, type ChatMessage, type ChatOptions } from "./client";
import {
  INTENT_EXTRACTION_PROMPT,
  parseIntent,
  type EmotionalIntent,
} from "./prompts/intent";
import { buildGenerationPrompt } from "./prompts/generation";
import {
  buildCriticPrompt,
  CRITIC_MAX_ITERATIONS,
  CRITIC_PASS_SCORE,
  parseVerdict,
} from "./prompts/critic";

export type DedicationFormat =
  | "poem"
  | "letter"
  | "quote"
  | "video"
  | "slideshow"
  | "song";

export interface RecipientProfile {
  name: string;
  nickname?: string | null;
  relationship?: string | null;
  notes?: string | null;
  memories?: string[]; // enriched from Supermemory before generating
}

export type ChatFn = (
  messages: ChatMessage[],
  options?: ChatOptions,
) => Promise<string>;

export interface EmotionEngineInput {
  brief: string;
  recipient: RecipientProfile;
  format: DedicationFormat;
  /** Optional explicit emotion target (overrides/extends the extracted one). */
  emotionTarget?: string;
  intensity?: 1 | 2 | 3;
  chatFn?: ChatFn;
}

export interface EmotionEngineResult {
  output: string;
  intent: EmotionalIntent;
  score: number;
  iterations: number;
}

/** Split generated output into display lines (video/slideshow scenes). */
export function splitLines(output: string): string[] {
  return output
    .split(/\n+/)
    .map((l) => l.replace(/^\[(tierno|intenso|suave|fuerte)\]\s*/i, "").trim())
    .filter((l) => l.length > 0);
}

/**
 * Runs the full Emotion Engine pipeline.
 * The caller enriches `input.recipient.memories` (Supermemory) and persists
 * the result (dedications table) — the engine itself is pure AI.
 */
export async function runEmotionEngine(
  input: EmotionEngineInput,
): Promise<EmotionEngineResult> {
  const run: ChatFn = input.chatFn ?? chat;

  // 1. Emotional intent extraction
  const intentRaw = await run(
    [
      { role: "system", content: INTENT_EXTRACTION_PROMPT },
      { role: "user", content: input.brief },
    ],
    { temperature: 0.3, maxTokens: 400 },
  );
  const intent = parseIntent(intentRaw);

  const emotionTarget =
    input.emotionTarget && input.emotionTarget.trim().length > 0
      ? input.emotionTarget.trim()
      : intent.emotions.join(", ");
  const intensity = input.intensity ?? intent.intensity;

  // 2–4. Generate + critic loop
  let best = { output: "", score: 0 };
  let fixHint = "";

  for (let i = 0; i < CRITIC_MAX_ITERATIONS; i++) {
    const systemPrompt =
      buildGenerationPrompt({
        emotionTarget,
        intensity,
        recipient: input.recipient,
        occasion: intent.occasion,
        brief: input.brief,
        format: input.format,
      }) + (fixHint ? `\n\nCORRECCIÓN DEL CRÍTICO (aplica esto): ${fixHint}` : "");

    const output = await run(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Crea el contenido para ${input.recipient.name}.` },
      ],
      { temperature: 0.9 },
    );

    const verdictRaw = await run(
      [
        {
          role: "system",
          content: buildCriticPrompt(emotionTarget, output),
        },
        { role: "user", content: "Evalúa el texto." },
      ],
      { temperature: 0.2, maxTokens: 300 },
    );
    const verdict = parseVerdict(verdictRaw);

    if (verdict.score > best.score) {
      best = { output, score: verdict.score };
    }
    if (verdict.score >= CRITIC_PASS_SCORE) {
      return { output, intent, score: verdict.score, iterations: i + 1 };
    }
    fixHint = verdict.feedback;
  }

  return {
    output: best.output,
    intent,
    score: best.score,
    iterations: CRITIC_MAX_ITERATIONS,
  };
}
