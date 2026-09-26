// Shape-checking for Lovi slot declarations.
//
// Slots come from the AI code generator (or the client); this keeps only
// well-formed declarations with known slot types so a malformed response
// can never break the slot-fill form or the LOVI_DATA contract.

import { LoviValidationError } from "./sanitize";
import type { LoviSlot, LoviSlotType } from "./slots";

const KNOWN_SLOT_TYPES: ReadonlySet<string> = new Set([
  "text",
  "names",
  "photos[]",
  "poem_lines[]",
  "memories[]",
  "music",
  "date",
]);

// The code-generation prompt (lib/openrouter/prompts/lovi-code.md) asks the
// model for the short forms ("photos", "poem_lines", "memories"); the stored
// contract (lib/lovis/slots.ts) uses the bracketed forms. Normalize here so
// both stay compatible.
const SHORT_TO_CANONICAL: Record<string, LoviSlotType> = {
  photos: "photos[]",
  poem_lines: "poem_lines[]",
  memories: "memories[]",
};

const KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/;
const MAX_SLOTS = 20;

/**
 * Validate raw slot declarations and return the clean list.
 * Unknown slot types are dropped; malformed entries throw
 * LoviValidationError with a Spanish message.
 */
export function validateSlots(slots: unknown): LoviSlot[] {
  if (!Array.isArray(slots)) {
    throw new LoviValidationError(
      "Los slots del Lovi no tienen un formato válido. Genera el detalle de nuevo.",
    );
  }
  if (slots.length === 0) {
    throw new LoviValidationError(
      "El Lovi no declara ningún slot. Necesita al menos el slot de nombres.",
    );
  }
  if (slots.length > MAX_SLOTS) {
    throw new LoviValidationError(
      `El Lovi declara demasiados slots (máximo ${MAX_SLOTS}).`,
    );
  }

  const out: LoviSlot[] = [];
  const seen = new Set<string>();

  for (const raw of slots) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const key = typeof r.key === "string" ? r.key.trim() : "";
    const rawType = typeof r.type === "string" ? r.type.trim() : "";
    // Normalize short AI-emitted forms ("photos") to the canonical
    // contract forms ("photos[]").
    const type = SHORT_TO_CANONICAL[rawType] ?? rawType;

    // Drop unknown slot types instead of failing the whole artifact —
    // the form only knows how to fill the documented types.
    if (!KNOWN_SLOT_TYPES.has(type)) continue;
    if (!KEY_RE.test(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);

    const label =
      typeof r.label === "string" && r.label.trim().length > 0
        ? r.label.trim().slice(0, 60)
        : key;

    out.push({
      key,
      type: type as LoviSlotType,
      label,
      required: r.required === true,
    });
  }

  if (out.length === 0) {
    throw new LoviValidationError(
      "El Lovi no declara ningún slot válido. Genera el detalle de nuevo.",
    );
  }
  return out;
}
