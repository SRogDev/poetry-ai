import { NextRequest } from "next/server";
import { chat, DEFAULT_CODE_MODEL } from "@/lib/openrouter/client";
import {
  buildLoviCodePrompt,
  parseGeneratedLovi,
} from "@/lib/openrouter/prompts/lovi-code";
import { sanitizeLoviCode, LoviValidationError } from "@/lib/lovis/sanitize";
import { validateSlots } from "@/lib/lovis/validate";
import { SAMPLE_PREVIEW_DATA } from "@/lib/lovis/samples";
import { authed, json } from "@/lib/lovis/server";

/**
 * POST /api/lovis/generate — generate a Lovi from a natural-language idea.
 * Auth required. Does NOT spend roses and does NOT save: it returns
 * {code, slots, previewData} for the studio preview. Roses are spent on
 * publish (POST /api/lovis).
 */
export async function POST(req: NextRequest) {
  const { user } = await authed();
  if (!user) {
    return json({ error: "Inicia sesión para crear un Lovi." }, 401);
  }

  const body = await req.json().catch(() => null);
  const idea = typeof body?.idea === "string" ? body.idea.trim() : "";
  if (!idea) return json({ error: "Describe tu idea primero." }, 400);
  if (idea.length > 500)
    return json({ error: "La idea es muy larga (máximo 500 caracteres)." }, 400);

  let raw: string;
  try {
    raw = await chat([{ role: "user", content: buildLoviCodePrompt(idea) }], {
      model: process.env.OPENROUTER_CODE_MODEL || DEFAULT_CODE_MODEL,
      temperature: 0.7,
      maxTokens: 6000,
    });
  } catch (e) {
    console.error("[lovis] codegen failed:", (e as Error).message);
    return json(
      {
        error:
          "La IA no está disponible ahora mismo. Intenta de nuevo en un momento.",
      },
      502,
    );
  }

  let generated;
  try {
    generated = parseGeneratedLovi(raw);
  } catch {
    return json(
      {
        error:
          "La IA no devolvió un detalle válido. Intenta describir tu idea de otra forma.",
      },
      502,
    );
  }

  try {
    const code = sanitizeLoviCode(generated.code);
    const slots = validateSlots(generated.slots);
    const previewData =
      generated.previewData &&
      typeof generated.previewData === "object" &&
      Object.keys(generated.previewData).length > 0
        ? generated.previewData
        : SAMPLE_PREVIEW_DATA;
    return json({ code, slots, previewData });
  } catch (e) {
    if (e instanceof LoviValidationError) {
      console.error("[lovis] generated code failed validation:", e.message);
      return json(
        {
          error:
            "La IA generó un detalle que no pasó la validación. Intenta con otra idea.",
        },
        502,
      );
    }
    throw e;
  }
}
