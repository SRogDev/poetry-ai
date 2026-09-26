// Pure helpers for photo handling in the composers (testable, no DOM).

export const MIN_PHOTOS = 3;
export const MAX_PHOTOS = 10;
export const MAX_DIMENSION = 1080;

/** Downscale dimensions keeping aspect ratio; never upscales. */
export function computeDownscaleSize(
  w: number,
  h: number,
  maxDim: number = MAX_DIMENSION,
): { w: number; h: number } {
  const scale = Math.min(1, maxDim / Math.max(w, h));
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

export type FileValidation = { ok: true } | { ok: false; error: string };

/** Validate a user-selected file list before uploading. */
export function validateImageFiles(files: File[]): FileValidation {
  if (files.length < MIN_PHOTOS) {
    return {
      ok: false,
      error: `Elige entre ${MIN_PHOTOS} y ${MAX_PHOTOS} fotos.`,
    };
  }
  if (files.length > MAX_PHOTOS) {
    return {
      ok: false,
      error: `Máximo ${MAX_PHOTOS} fotos por pase de diapositivas.`,
    };
  }
  const bad = files.find((f) => !f.type.startsWith("image/"));
  if (bad) {
    return { ok: false, error: `"${bad.name}" no es una imagen válida.` };
  }
  return { ok: true };
}
