// Emotion Engine — step 1: extract the emotional intent from a brief.
// The user never asks for "a poem". They ask for a feeling:
// "quiero que llore de felicidad", "quiero reconciliarme con mi papá".
// Prompt text lives in intent.md (server-only module).
import { loadPrompt } from "./loader";

export interface EmotionalIntent {
  emotions: string[];
  intensity: 1 | 2 | 3;
  occasion: string | null;
  relationship: string;
  register: string;
  summary: string;
}

export const INTENT_EXTRACTION_PROMPT: string = loadPrompt("intent");

export function parseIntent(raw: string): EmotionalIntent {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const parsed = JSON.parse(cleaned) as Partial<EmotionalIntent>;
  const intensity =
    parsed.intensity === 1 ? 1 : parsed.intensity === 3 ? 3 : 2;
  return {
    emotions:
      Array.isArray(parsed.emotions) && parsed.emotions.length > 0
        ? parsed.emotions
        : ["ternura"],
    intensity,
    occasion: parsed.occasion ?? null,
    relationship: parsed.relationship ?? "otro",
    register: parsed.register ?? "tierno",
    summary: parsed.summary ?? "",
  };
}
