// Social sharing helpers for /s/[id] dedication pages.
// WhatsApp link previews need an OG image under ~300KB — design for that.

/** WhatsApp truncates/drops OG images above roughly this size. */
export const OG_IMAGE_MAX_BYTES = 300_000;

/** Public URL of a dedication share page. */
export function shareUrl(shareId: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/s/${shareId}`;
}

/** Hashtag-ready caption for the "copy caption" button (Phase 2). */
export function dedicationCaption(names: string): string {
  return `Para ${names} 🌹 Hecho con Poetry AI #poetryai #detallesquesesienten`;
}

// TODO Phase 2: dynamic OG image route (app/s/[id]/opengraph-image.tsx)
// rendering a <300KB teaser PNG of the dedication.
