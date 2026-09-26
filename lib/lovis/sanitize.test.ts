import { describe, expect, it } from "vitest";
import {
  LOVI_MAX_BYTES,
  LoviValidationError,
  sanitizeLoviCode,
} from "./sanitize";

const CLEAN = `<!doctype html><html><head><style>body{color:#EC4899}</style></head><body><script>const d = window.LOVI_DATA; document.body.textContent = String(d.names ?? "");</script></body></html>`;

describe("sanitizeLoviCode", () => {
  it("passes clean self-contained code through untouched", () => {
    expect(sanitizeLoviCode(CLEAN)).toBe(CLEAN);
  });

  it("rejects external <script src>", () => {
    const bad = CLEAN.replace(
      "</head>",
      '<script src="https://cdn.evil.com/x.js"></script></head>',
    );
    expect(() => sanitizeLoviCode(bad)).toThrowError(LoviValidationError);
  });

  it("rejects external <link> stylesheets", () => {
    const bad = CLEAN.replace(
      "</head>",
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=X"></head>',
    );
    expect(() => sanitizeLoviCode(bad)).toThrowError(LoviValidationError);
  });

  it("rejects CSS @import with an external url", () => {
    const bad = CLEAN.replace(
      "<style>",
      '<style>@import url("https://evil.com/a.css");',
    );
    expect(() => sanitizeLoviCode(bad)).toThrowError(LoviValidationError);
  });

  it("rejects code larger than LOVI_MAX_BYTES", () => {
    const big = "x".repeat(LOVI_MAX_BYTES + 1);
    expect(() => sanitizeLoviCode(big)).toThrowError(LoviValidationError);
  });

  it("rejects code that never reads LOVI_DATA", () => {
    expect(() =>
      sanitizeLoviCode("<html><body><p>Hola, mundo</p></body></html>"),
    ).toThrowError(/LOVI_DATA/);
  });

  it("accepts a bare LOVI_DATA read (without the window. prefix)", () => {
    const code =
      "<html><body><script>const d = LOVI_DATA;</script></body></html>";
    expect(sanitizeLoviCode(code)).toBe(code);
  });

  it("strips javascript: URLs instead of passing them through", () => {
    const out = sanitizeLoviCode(CLEAN + `<a href="javascript:alert(1)">x</a>`);
    expect(out).not.toMatch(/javascript:/i);
    // the artifact still renders — nothing else was damaged
    expect(out).toContain("window.LOVI_DATA");
  });

  it("rejects <meta http-equiv=refresh> redirects", () => {
    const bad = CLEAN.replace(
      "</head>",
      '<meta http-equiv="refresh" content="0;url=https://evil.com"></head>',
    );
    expect(() => sanitizeLoviCode(bad)).toThrowError(LoviValidationError);
  });

  it("throws Spanish user-facing messages", () => {
    try {
      sanitizeLoviCode("<p>sin datos</p>");
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(LoviValidationError);
      expect((e as Error).message).toMatch(/Lovi/i);
      expect((e as Error).message.length).toBeGreaterThan(10);
    }
  });

  it("rejects empty code", () => {
    expect(() => sanitizeLoviCode("")).toThrowError(LoviValidationError);
  });
});
