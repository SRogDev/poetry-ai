// Emotion Engine — step 4: the emotion critic.
// A second cheap model scores the draft against the target emotion and the
// generator revises until it passes the threshold (max 3 iterations).
// This loop is the quality gate and the core IP of Poetry AI.
// Prompt text lives in critic.md (server-only module).
import { fillTemplate, loadPrompt } from "./loader";

export interface CriticVerdict {
  score: number; // 1-10
  feedback: string;
}

/** Score at or above which a draft is accepted. */
export const CRITIC_PASS_SCORE = 8;

/** Max critic loop iterations before accepting the best draft. */
export const CRITIC_MAX_ITERATIONS = 3;

export function buildCriticPrompt(emotionTarget: string, draft: string): string {
  return fillTemplate(loadPrompt("critic"), {
    EMOTION_TARGET: emotionTarget,
    DRAFT: draft,
  });
}

export function parseVerdict(raw: string): CriticVerdict {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const parsed = JSON.parse(cleaned) as Partial<CriticVerdict>;
  const score =
    typeof parsed.score === "number"
      ? Math.min(10, Math.max(1, Math.round(parsed.score)))
      : 5;
  return {
    score,
    feedback:
      typeof parsed.feedback === "string" && parsed.feedback.length > 0
        ? parsed.feedback
        : "sin comentarios",
  };
}
