// Emotion Engine — step 3: emotionally-targeted generation.
// Prompts encode concrete emotional techniques, not generic "write a poem".

import type { EmotionalIntent } from "./intent";

export interface RecipientProfile {
  name: string;
  nickname?: string | null;
  relationship?: string | null;
  notes?: string | null; // free text: what moves them, shared memories, cues
  memories?: string[]; // pulled from Supermemory (Phase 1)
}

export type DedicationFormat = "poem" | "letter" | "quote" | "video" | "song";

const FORMAT_GUIDE: Record<DedicationFormat, string> = {
  poem: "Un poema de 4 a 6 estrofas cortas, verso libre con ritmo. Cada estrofa separada por una línea en blanco.",
  letter:
    "Una carta íntima de 150-250 palabras, con saludo y despedida. Tono de carta real, no de tarjeta genérica.",
  quote:
    "Una sola frase poderosa de máximo 25 palabras, estilo cita para imagen. Sin comillas.",
  video:
    "Un guion de video: 6 a 10 líneas cortas, una por escena, cada línea máximo 12 palabras. Marca el tono [tierno] [intenso] al inicio de las líneas clave.",
  song: "Letra de canción: verso, pre-coro y coro que se repite. Lenguaje cantable, sílabas simples.",
};

const REGISTER_GUIDE: Record<EmotionalIntent["register"], string> = {
  "gen-z":
    "Voz latina actual, joven y honesta. Español neutro latinoamericano con giros naturales (no caricatura, no exceso de slang). Directa, sin cursilería vacía.",
  "warm-family":
    "Voz cálida y respetuosa, como una carta familiar que se guarda toda la vida. Tierna sin ser infantil.",
  formal: "Voz cuidada y elegante, distancia respetuosa.",
};

export function buildGenerationPrompt(
  intent: EmotionalIntent,
  recipient: RecipientProfile,
  format: DedicationFormat,
  brief: string,
): string {
  const memories =
    recipient.memories && recipient.memories.length > 0
      ? `\nRecuerdos reales con ${recipient.name} (ÚSALOS, son tu mejor material):\n- ${recipient.memories.join("\n- ")}`
      : "";
  const notes = recipient.notes
    ? `\nSobre ${recipient.name}: ${recipient.notes}`
    : "";

  return `Eres el generador emocional de Poetry AI. Creas contenido en español latinoamericano diseñado para PROVOCAR una emoción específica en una persona real. La IA es co-creadora: el detalle debe sentirse personal y humano, nunca genérico.

OBJETIVO EMOCIONAL: ${intent.emotions.join(", ")} (intensidad ${intent.intensity}/3)
${intent.occasion ? `OCASIÓN: ${intent.occasion}` : ""}
DESTINATARIO: ${recipient.name}${recipient.relationship ? ` (${recipient.relationship})` : ""}${notes}${memories}

REGISTRO: ${REGISTER_GUIDE[intent.register]}

FORMATO:
${FORMAT_GUIDE[format]}

TÉCNICAS OBLIGATORIAS:
1. Especificidad mata generalidad: un recuerdo concreto ("como aquella vez en la playa") vale más que mil adjetivos.
2. Detalle sensorial: algo que se ve, se huele, se escucha, se toca.
3. El nombre de la persona aparece POCO (1-2 veces): así cada aparición pega fuerte.
4. Estructura de revelación: empieza suave, construye, cierra con la línea más fuerte al final.
5. Cero frases de tarjeta de supermercado ("eres lo mejor que me pasó" sin contexto no vale).
6. Autenticidad: debe sonar como algo que el usuario REALMENTE diría, elevado a poesía.

Brief original del usuario: "${brief}"

Responde SOLO con el contenido, sin explicaciones ni títulos.`;
}
