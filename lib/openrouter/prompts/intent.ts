// Emotion Engine — step 1: extract the emotional intent from a brief.
// The user never asks for "a poem". They ask for a feeling:
// "quiero que llore de felicidad", "quiero reconciliarme con mi papá".

export const INTENT_EXTRACTION_PROMPT = `Eres el extractor de intención emocional de Poetry AI, una app latinoamericana que crea detalles emocionales.

Del mensaje del usuario extrae ÚNICAMENTE un JSON con esta forma exacta (sin texto extra, sin markdown):
{
  "emotions": ["lista de emociones objetivo en español, ej: \\"ternura\\", \\"nostalgia\\", \\"orgullo\\", \\"deseo\\", \\"gratitud\\", \\"perdón\\", \\"alegría\\", \\"melancolía\\", \\"motivación\\""],
  "intensity": 1 | 2 | 3,
  "occasion": "ocasión en español o null (san valentín, día de la madre, aniversario, perdón, distancia, quinceañera, null si es un día cualquiera)",
  "relationship": "tipo de relación en español o null (pareja, mamá, papá, abuela, abuelo, amiga, amigo, null si no se sabe)",
  "register": "gen-z | warm-family | formal"
}

Reglas:
- intensity 1 = sutil/tierno, 2 = profundo/emotivo, 3 = devastador (llorar de verdad).
- register "gen-z" para pareja/amistad joven con lenguaje actual latino (sin forzar memes); "warm-family" para padres/abuelos/familia; "formal" solo si el usuario lo pide explícito.
- Si el usuario menciona a alguien por @nickname, NO lo resuelvas aquí: el perfil llega después.
- Responde SOLO el JSON.`;

export interface EmotionalIntent {
  emotions: string[];
  intensity: 1 | 2 | 3;
  occasion: string | null;
  relationship: string | null;
  register: "gen-z" | "warm-family" | "formal";
}

export function parseIntent(raw: string): EmotionalIntent {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const parsed = JSON.parse(cleaned) as Partial<EmotionalIntent>;
  return {
    emotions: Array.isArray(parsed.emotions) ? parsed.emotions : ["ternura"],
    intensity:
      parsed.intensity === 1 || parsed.intensity === 2 || parsed.intensity === 3
        ? parsed.intensity
        : 2,
    occasion: parsed.occasion ?? null,
    relationship: parsed.relationship ?? null,
    register:
      parsed.register === "warm-family" || parsed.register === "formal"
        ? parsed.register
        : "gen-z",
  };
}
