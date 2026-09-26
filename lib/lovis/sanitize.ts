// HTML sanitization for community-created Lovis.
//
// Defense in depth: Lovis ALWAYS render inside a sandboxed iframe
// (see components/lovis/LoviRenderer), so even hostile code cannot touch
// the parent page or the user's session. Sanitization is the second layer.

/**
 * Validate + clean AI/user-generated Lovi HTML before storing.
 * Phase 2: enforce with a real sanitizer —
 *   - reject external <script src> / <link> / @import (self-contained only)
 *   - enforce a max byte size
 *   - require at least one read of window.LOVI_DATA
 */
export function sanitizeLoviCode(code: string): string {
  // TODO Phase 2: real validation (see above). Scaffold: passthrough.
  return code;
}

/** Max bytes of stored Lovi code (keeps the gallery light). */
export const LOVI_MAX_BYTES = 200_000;
