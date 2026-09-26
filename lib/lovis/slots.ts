// The Lovi data contract.
// Every Lovi declares slots; at render time the app injects window.LOVI_DATA
// with the dedication's data. The AI generator prompt (lib/openrouter/prompts/lovi-code)
// enforces this contract so ANY Lovi works with ANY dedication.

export type LoviSlotType =
  | "text"
  | "names"
  | "photos[]"
  | "poem_lines[]"
  | "memories[]"
  | "music"
  | "date";

export interface LoviSlot {
  key: string;
  type: LoviSlotType;
  label: string;
  required: boolean;
}

export type LoviData = Record<string, unknown>;

/** Global the Lovi code reads its data from. */
export const LOVI_DATA_GLOBAL = "LOVI_DATA";

/** Slots every Lovi understands (built-ins can declare more). */
export const BASE_SLOTS: LoviSlot[] = [
  { key: "names", type: "names", label: "Nombres", required: true },
  { key: "message", type: "text", label: "Mensaje principal", required: false },
  { key: "poem_lines", type: "poem_lines[]", label: "Versos", required: false },
  { key: "photos", type: "photos[]", label: "Fotos", required: false },
  { key: "memories", type: "memories[]", label: "Recuerdos", required: false },
  { key: "music", type: "music", label: "Música", required: false },
  { key: "date", type: "date", label: "Fecha especial", required: false },
];

/**
 * Embed the dedication data into a Lovi's HTML so the artifact can read
 * window.LOVI_DATA. The payload is escaped to avoid breaking out of <script>.
 */
export function buildLoviHtml(code: string, data: LoviData): string {
  const payload = JSON.stringify(data).replace(/</g, "\\u003c");
  const injection = `<script>window.${LOVI_DATA_GLOBAL}=${payload};</script>`;
  if (code.includes("</head>")) {
    return code.replace("</head>", `${injection}</head>`);
  }
  return injection + code;
}

/** Human-readable slot list for the Lovi code-generation prompt. */
export function describeSlots(slots: LoviSlot[]): string {
  return slots
    .map(
      (s) =>
        `- ${s.key} (${s.type})${s.required ? " [requerido]" : ""}: ${s.label}`,
    )
    .join("\n");
}
