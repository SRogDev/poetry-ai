import { describe, expect, it } from "vitest";
import { computeDownscaleSize, validateImageFiles } from "./photoFiles";

describe("computeDownscaleSize", () => {
  it("keeps aspect ratio and caps the long side at maxDim", () => {
    expect(computeDownscaleSize(4000, 3000, 1080)).toEqual({
      w: 1080,
      h: 810,
    });
    expect(computeDownscaleSize(2000, 4000, 1080)).toEqual({
      w: 540,
      h: 1080,
    });
  });

  it("does not upscale small images", () => {
    expect(computeDownscaleSize(500, 400, 1080)).toEqual({ w: 500, h: 400 });
  });

  it("returns integers", () => {
    const { w, h } = computeDownscaleSize(3333, 2222, 1080);
    expect(Number.isInteger(w)).toBe(true);
    expect(Number.isInteger(h)).toBe(true);
  });
});

describe("validateImageFiles", () => {
  const img = (name: string) => ({ name, type: "image/jpeg" }) as File;
  const txt = (name: string) => ({ name, type: "text/plain" }) as File;

  it("accepts up to 10 images", () => {
    const files = Array.from({ length: 10 }, (_, i) => img(`p${i}.jpg`));
    expect(validateImageFiles(files).ok).toBe(true);
  });

  it("rejects more than 10 images", () => {
    const files = Array.from({ length: 11 }, (_, i) => img(`p${i}.jpg`));
    expect(validateImageFiles(files)).toEqual({
      ok: false,
      error: "Máximo 10 fotos por pase de diapositivas.",
    });
  });

  it("rejects non-image files", () => {
    expect(
      validateImageFiles([img("a.jpg"), img("b.jpg"), txt("c.txt")]),
    ).toEqual({
      ok: false,
      error: '"c.txt" no es una imagen válida.',
    });
  });

  it("rejects fewer than 3 images", () => {
    expect(validateImageFiles([img("a.jpg"), img("b.jpg")])).toEqual({
      ok: false,
      error: "Elige entre 3 y 10 fotos.",
    });
  });

  it("rejects an empty selection", () => {
    expect(validateImageFiles([]).ok).toBe(false);
  });
});
