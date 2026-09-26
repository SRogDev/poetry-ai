import { describe, expect, it } from "vitest";
import { wrapText } from "./letterText";

// naive measure: 10px per char
const measure = (s: string) => s.length * 10;

describe("wrapText", () => {
  it("wraps long lines at word boundaries", () => {
    const lines = wrapText("hola mundo cruel y hermoso", 100, measure);
    expect(lines).toEqual(["hola mundo", "cruel y", "hermoso"]);
  });

  it("preserves explicit newlines as paragraphs", () => {
    const lines = wrapText("primera\nsegunda linea larga", 100, measure);
    expect(lines[0]).toBe("primera");
    expect(lines.length).toBeGreaterThan(2);
  });

  it("keeps empty lines between paragraphs", () => {
    const lines = wrapText("a\n\nb", 100, measure);
    expect(lines).toEqual(["a", "", "b"]);
  });

  it("breaks overlong words that exceed maxWidth", () => {
    const lines = wrapText("supercalifragilistico", 100, measure);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(measure(l)).toBeLessThanOrEqual(100);
  });

  it("never exceeds maxWidth", () => {
    const text =
      "Esta es una carta larga con muchas palabras que deben ajustarse al ancho disponible sin desbordar el papel.";
    const lines = wrapText(text, 200, measure);
    for (const l of lines) expect(measure(l)).toBeLessThanOrEqual(200);
  });
});
