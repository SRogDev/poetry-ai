// Emotion Engine — the pipeline: brief → intent → generate → critic loop.
// Plain prompt chaining in server actions (no LangGraph).
// Phase 1: wire to Supermemory (recipient memories) and the dedications table.

import { chat } from "./client";
import {
  INTENT_EXTRACTION_PROMPT,
  parseIntent,
  type EmotionalIntent,
} from "./prompts/intent";
import {
  buildGenerationPrompt,
  type DedicationFormat,
  type RecipientProfile,
} from "./prompts/generation";
import {
  buildCriticPrompt,
  CRITIC_MAX_ITERATIONS,
  CRITIC_PASS_SCORE,
  CRITIC_PROMPT,
  parseVerdict,
} from "./prompts/critic";

export interface EmotionEngineInput {
  brief: string;
  recipient: RecipientProfile;
  format: DedicationFormat;
}

export interface EmotionEngineResult {
  output: string;
  intent: EmotionalIntent;
  score: number;
  iterations: number;
}

/**
 * Runs the full Emotion Engine pipeline.
 * TODO Phase 1: enrich `recipient.memories` from Supermemory before generating,
 * and persist the result + intent + score into `dedications`.
 */
export async function runEmotionEngine(
  input: EmotionEngineInput,
): Promise<EmotionEngineResult> {
  // 1. Emotional intent extraction
  const intentRaw = await chat(
    [
      { role: "system", content: INTENT_EXTRACTION_PROMPT },
      { role: "user", content: input.brief },
    ],
    { temperature: 0.3, maxTokens: 300 },
  );
  const intent = parseIntent(intentRaw);

  // 2-4. Generate + critic loop
  let best = { output: "", score: 0 };
  let fixHint = "";

  for (let i = 0; i < CRITIC_MAX_ITERATIONS; i++) {
    const systemPrompt =
      buildGenerationPrompt(
        intent,
        input.recipient,
        input.format,
        input.brief,
      ) + (fixHint ? `\n\nCORRECCIÓN DEL CRÍTICO (aplica esto): ${fixHint}` : "");

    const output = await chat(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Crea el contenido para ${input.recipient.name}.`,
        },
      ],
      { temperature: 0.9 },
    );

    const verdictRaw = await chat(
      [
        { role: "system", content: CRITIC_PROMPT },
        { role: "user", content: buildCriticPrompt(intent, output) },
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
    fixHint = verdict.fixHint;
  }

  return { output: best.output, intent, score: best.score, iterations: CRITIC_MAX_ITERATIONS };
}
