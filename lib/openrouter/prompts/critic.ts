// Emotion Engine — step 4: the emotion critic.
// A second cheap model scores the draft against the target emotion and the
// generator revises until it passes the threshold (max 3 iterations).
// This loop is the quality gate and the core IP of Poetry AI.

import type { EmotionalIntent } from "./intent";

export const CRITIC_PROMPT = `Eres el crítico emocional de Poetry AI. Evalúas si un texto REALMENTE provoca la emoción objetivo en el destinatario. Eres exigente: la mayoría de los textos genéricos reprueban.

Responde ÚNICAMENTE un JSON con esta forma exacta (sin texto extra, sin markdown):
{
  "score": 1-10,
  "fails": ["lista corta de qué falla, en español"],
  "fix_hint": "una instrucción concreta de una línea para arreglarlo, en español"
}

Criterios (sé duro):
- 9-10: me puso la piel de gallina / me haría llorar. Específico, sensorial, personal.
- 7-8: emotivo y bueno, pero le falta un golpe final o un detalle concreto.
- 5-6: bonito pero genérico; podría ser para cualquiera.
- 1-4: tarjeta de supermercado, clichés, o tono equivocado.

Penaliza fuerte: clichés ("mi cielo", "mi todo" sin contexto), adjetivos sin imágenes, que suene a chatbot, que no mencione nada específico de la persona.`;

export interface CriticVerdict {
  score: number;
  fails: string[];
  fixHint: string;
}

/** Score at or above which a draft is accepted. */
export const CRITIC_PASS_SCORE = 8;

/** Max critic loop iterations before accepting the best draft. */
export const CRITIC_MAX_ITERATIONS = 3;

export function buildCriticPrompt(
  intent: EmotionalIntent,
  draft: string,
): string {
  return `Emoción objetivo: ${intent.emotions.join(", ")} (intensidad ${intent.intensity}/3)
Registro esperado: ${intent.register}

TEXTO A EVALUAR:
"""
${draft}
"""`;
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
    fails: Array.isArray(parsed.fails) ? parsed.fails : [],
    fixHint:
      typeof parsed.fixHint === "string" && parsed.fixHint.length > 0
        ? parsed.fixHint
        : "Hazlo más específico y personal.",
  };
}
