// HTML sanitization for community-created Lovis.
//
// Defense in depth: Lovis ALWAYS render inside a sandboxed iframe
// (see components/lovis/LoviRenderer), so even hostile code cannot touch
// the parent page or the user's session. Sanitization is the second layer:
// it enforces the self-contained contract (no external resources, no
// redirects) and guarantees the artifact actually reads window.LOVI_DATA.

/** User-facing validation error (Spanish copy for the creator). */
export class LoviValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoviValidationError";
  }
}

/** Max bytes of stored Lovi code (keeps the gallery light). */
export const LOVI_MAX_BYTES = 200_000;

/**
 * Validate + clean AI/user-generated Lovi HTML before storing.
 * Throws LoviValidationError with a Spanish user-facing message when the
 * code breaks the self-contained contract.
 */
export function sanitizeLoviCode(code: string): string {
  if (typeof code !== "string" || code.trim().length === 0) {
    throw new LoviValidationError(
      "El código del Lovi está vacío. Describe tu idea y genera el detalle de nuevo.",
    );
  }

  if (Buffer.byteLength(code, "utf8") > LOVI_MAX_BYTES) {
    throw new LoviValidationError(
      `El código del Lovi es demasiado grande (máximo ${Math.round(LOVI_MAX_BYTES / 1000)} KB). Pide una versión más simple.`,
    );
  }

  // External scripts: the artifact must be fully self-contained.
  if (/<script\b[^>]*\bsrc\s*=/i.test(code)) {
    throw new LoviValidationError(
      "El Lovi no puede cargar scripts externos (<script src>). Todo el JavaScript debe ir inline en el mismo documento.",
    );
  }

  // External stylesheets / resources via <link>.
  if (/<link\b[^>]*\bhref\s*=\s*["']?\s*(https?:)?\/\//i.test(code)) {
    throw new LoviValidationError(
      "El Lovi no puede cargar recursos externos (<link> a otra web). Usa estilos inline.",
    );
  }

  // CSS @import of external resources (fonts, stylesheets...).
  if (
    /@import\s+(url\s*\([^)]*\)|["'])\s*["']?\s*(https?:)?\/\//i.test(code) ||
    /@import[^;]*url\s*\(\s*["']?\s*https?:/i.test(code)
  ) {
    throw new LoviValidationError(
      "El Lovi no puede importar estilos externos (@import). Usa CSS inline.",
    );
  }

  // Redirects / meta refresh: the share page must stay in control.
  if (/<meta\b[^>]*http-equiv\s*=\s*["']?\s*refresh/i.test(code)) {
    throw new LoviValidationError(
      "El Lovi no puede redirigir la página (<meta refresh>).",
    );
  }

  // Neutralize javascript: URLs (kept as inert "#" links).
  let clean = code.replace(
    /(\s(?:href|src|xlink:href|action)\s*=\s*)(["'])\s*javascript:[^"']*\2/gi,
    '$1$2#$2',
  );
  // Catch any stragglers outside attributes.
  clean = clean.replace(/javascript\s*:/gi, "");

  // The contract: every Lovi reads its dedication data from window.LOVI_DATA.
  if (!/\bLOVI_DATA\b/.test(clean)) {
    throw new LoviValidationError(
      "El Lovi debe leer sus datos de window.LOVI_DATA (nombres, versos, recuerdos…). Nada puede ir hardcodeado.",
    );
  }

  return clean;
}
