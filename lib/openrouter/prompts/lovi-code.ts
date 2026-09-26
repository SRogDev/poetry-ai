// Lovi code generation (AI-generated interactive dedication artifacts).
// The user describes the artifact in chat; a code model generates a
// self-contained HTML document honoring the Lovi data contract:
// the artifact reads its content from window.LOVI_DATA (injected at render).
// Prompt text lives in lovi-code.md (server-only module).
import { loadPrompt } from "./loader";

export const LOVI_CODE_PROMPT: string = loadPrompt("lovi-code");

export function buildLoviCodePrompt(idea: string): string {
  return `${LOVI_CODE_PROMPT}\n\n## Idea del usuario\n${idea}`;
}

export type LoviSlotType =
  | "names"
  | "text"
  | "poem_lines"
  | "memories"
  | "photos";

export interface LoviSlotDecl {
  key: string;
  type: LoviSlotType;
  label: string;
  required: boolean;
}

export interface GeneratedLovi {
  code: string;
  slots: LoviSlotDecl[];
  previewData: Record<string, unknown>;
}

export function parseGeneratedLovi(raw: string): GeneratedLovi {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const parsed = JSON.parse(cleaned) as Partial<GeneratedLovi>;
  if (typeof parsed.code !== "string" || parsed.code.length === 0) {
    throw new Error("Lovi generation did not return code");
  }
  return {
    code: parsed.code,
    slots: Array.isArray(parsed.slots) ? parsed.slots : [],
    previewData:
      typeof parsed.previewData === "object" && parsed.previewData !== null
        ? (parsed.previewData as Record<string, unknown>)
        : {},
  };
}
