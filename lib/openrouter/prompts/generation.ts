// Emotion Engine — step 3: emotionally-targeted generation.
// Prompts encode concrete emotional techniques, not generic "write a poem".
// Prompt text lives in generation.md (server-only module).
import type {
  DedicationFormat,
  RecipientProfile,
} from "../emotion-engine";
import { fillTemplate, loadPrompt } from "./loader";

export const FORMAT_GUIDE: Record<DedicationFormat, string> = {
  poem: "poema de 8–16 versos",
  letter: "carta de 120–220 palabras",
  quote: "frase de 1–2 líneas",
  video: "texto para video narrado: 6–10 líneas cortas y potentes",
  slideshow: "pies de foto poéticos: 8–12 líneas, una por foto, máximo 10 palabras cada una",
  song: "letra de canción: verso, pre-coro y coro, con estribillo memorable",
};

const INTENSITY_LABEL: Record<1 | 2 | 3, string> = {
  1: "sutil",
  2: "profundo",
  3: "devastador",
};

export interface GenerationContext {
  emotionTarget: string;
  intensity: 1 | 2 | 3;
  recipient: RecipientProfile;
  occasion: string | null;
  brief: string;
  format: DedicationFormat;
}

export function buildGenerationPrompt(ctx: GenerationContext): string {
  const recipientLine = `${ctx.recipient.name}${ctx.recipient.relationship ? ` (${ctx.recipient.relationship})` : ""}${ctx.recipient.notes ? ` — ${ctx.recipient.notes}` : ""}`;
  const memories =
    ctx.recipient.memories && ctx.recipient.memories.length > 0
      ? `## Memoria sobre esta persona\n${ctx.recipient.memories.map((m) => `- ${m}`).join("\n")}\n(Úsala para detalles concretos; nunca la menciones explícitamente.)`
      : "";
  return fillTemplate(loadPrompt("generation"), {
    EMOTION_TARGET: ctx.emotionTarget,
    INTENSITY_LABEL: `${ctx.intensity} (${INTENSITY_LABEL[ctx.intensity]})`,
    RECIPIENT_LINE: recipientLine,
    OCCASION: ctx.occasion ?? "sin ocasión especial",
    BRIEF: ctx.brief,
    MEMORY_BLOCK: memories,
  }).replace(
    "4. Longitud según formato: poema 8–16 versos · carta 120–220 palabras · frase 1–2 líneas · video 6–10 líneas cortas.",
    `4. Formato pedido: ${FORMAT_GUIDE[ctx.format]}.`,
  );
}
