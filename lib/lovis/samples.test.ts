import { describe, expect, it } from "vitest";
import { sanitizeLoviCode } from "./sanitize";
import {
  SAMPLE_LOVI_CODE,
  SAMPLE_LOVI_DESCRIPTION,
  SAMPLE_LOVI_NAME,
  SAMPLE_LOVI_SLOTS,
  SAMPLE_PREVIEW_DATA,
} from "./samples";
import { validateSlots } from "./validate";

describe("sample Lovi (Frasco de razones)", () => {
  it("is self-contained and under 15KB", () => {
    expect(Buffer.byteLength(SAMPLE_LOVI_CODE, "utf8")).toBeLessThan(15_000);
    expect(SAMPLE_LOVI_CODE).not.toMatch(/https?:\/\//);
  });

  it("passes the production sanitizer unchanged", () => {
    expect(sanitizeLoviCode(SAMPLE_LOVI_CODE)).toBe(SAMPLE_LOVI_CODE);
  });

  it("declares valid slots", () => {
    expect(validateSlots(SAMPLE_LOVI_SLOTS)).toEqual(SAMPLE_LOVI_SLOTS);
  });

  it("has preview data covering its slots", () => {
    expect(SAMPLE_PREVIEW_DATA.names).toBeDefined();
    expect(Array.isArray(SAMPLE_PREVIEW_DATA.memories)).toBe(true);
    expect(typeof SAMPLE_PREVIEW_DATA.message).toBe("string");
  });

  it("has gallery-ready name and description", () => {
    expect(SAMPLE_LOVI_NAME.length).toBeGreaterThan(0);
    expect(SAMPLE_LOVI_DESCRIPTION.length).toBeGreaterThan(20);
  });
});
