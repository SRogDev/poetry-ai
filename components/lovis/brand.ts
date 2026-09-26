// Brand tokens — Poetry AI rose theme (Roger, 2026-09-26).
// Red → pink gradient (#DC2626 → #EC4899). Overrides the design-system
// default palette for all Lovis UI.

/** Primary CTA: gradient bg + white text + shadow + press states. */
export const BTN_PRIMARY =
  "bg-gradient-to-r from-red-600 to-pink-500 text-white shadow-lg shadow-pink-500/25 hover:opacity-95 active:scale-[0.98]";

/** Gradient headline accent. */
export const TEXT_GRADIENT =
  "bg-gradient-to-r from-red-600 to-pink-500 bg-clip-text text-transparent";

/** Rose iconography accent. */
export const ICON_ROSE = "text-rose-600";

/** Rose focus ring (inputs). */
export const RING_ROSE = "focus:ring-rose-600";

/** Active-state pill: gradient background, white content. */
export const PILL_ACTIVE =
  "border-transparent bg-gradient-to-r from-red-600 to-pink-500 text-white shadow-md shadow-pink-500/25";
