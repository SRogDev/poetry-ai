import { describe, expect, it } from "vitest";
import {
  easeOutBack,
  kenBurnsDrawParams,
  mimeToExtension,
  pickVideoMimeType,
  sceneAt,
} from "./exportVideo";

describe("pickVideoMimeType", () => {
  it("prefers video/mp4 when supported", () => {
    expect(pickVideoMimeType(() => true)).toBe("video/mp4");
  });

  it("falls back to vp9 webm when mp4 unsupported", () => {
    expect(pickVideoMimeType((m) => m !== "video/mp4")).toBe(
      "video/webm;codecs=vp9",
    );
  });

  it("falls back to webm when MediaRecorder is absent", () => {
    expect(pickVideoMimeType(undefined)).toBe("video/webm;codecs=vp9");
  });
});

describe("mimeToExtension", () => {
  it("maps mp4 -> mp4", () => {
    expect(mimeToExtension("video/mp4")).toBe("mp4");
  });
  it("maps webm -> webm", () => {
    expect(mimeToExtension("video/webm;codecs=vp9")).toBe("webm");
  });
});

describe("easeOutBack", () => {
  it("starts at 0 and ends at 1", () => {
    expect(easeOutBack(0)).toBeCloseTo(0, 5);
    expect(easeOutBack(1)).toBeCloseTo(1, 5);
  });
  it("overshoots past 1 mid-way (pop effect)", () => {
    const v = easeOutBack(0.5);
    expect(v).toBeGreaterThan(1);
    expect(v).toBeLessThan(1.2);
  });
});

describe("sceneAt", () => {
  it("returns the scene index for a given time", () => {
    expect(sceneAt(0, 5, 4)).toBe(0);
    expect(sceneAt(4.1, 5, 4)).toBe(1);
    expect(sceneAt(8, 5, 4)).toBe(2);
  });
  it("clamps to the last scene at/past the end", () => {
    expect(sceneAt(20, 5, 4)).toBe(4);
    expect(sceneAt(19.99, 5, 4)).toBe(4);
  });
  it("clamps negative time to the first scene", () => {
    expect(sceneAt(-1, 5, 4)).toBe(0);
  });
});

describe("kenBurnsDrawParams", () => {
  const CW = 1080;
  const CH = 1920;

  it("always covers the canvas (draw rect >= canvas)", () => {
    for (const [iw, ih] of [
      [1920, 1080],
      [1080, 1920],
      [800, 800],
      [4000, 3000],
    ]) {
      for (const p of [0, 0.25, 0.5, 0.75, 1]) {
        const r = kenBurnsDrawParams(iw, ih, CW, CH, p, 0.3);
        expect(r.dw).toBeGreaterThanOrEqual(CW - 1);
        expect(r.dh).toBeGreaterThanOrEqual(CH - 1);
      }
    }
  });

  it("zooms monotonically from 1 to ~1.15 over progress", () => {
    const r0 = kenBurnsDrawParams(1080, 1920, CW, CH, 0, 0.5);
    const r1 = kenBurnsDrawParams(1080, 1920, CW, CH, 1, 0.5);
    const base = Math.max(CW / 1080, CH / 1920);
    expect(r0.dw).toBeCloseTo(1080 * base, 3);
    expect(r1.dw / r0.dw).toBeCloseTo(1.15, 2);
  });

  it("is deterministic for the same seed and varies across seeds", () => {
    const a = kenBurnsDrawParams(1080, 1920, CW, CH, 0.5, 0.2);
    const b = kenBurnsDrawParams(1080, 1920, CW, CH, 0.5, 0.2);
    const c = kenBurnsDrawParams(1080, 1920, CW, CH, 0.5, 0.9);
    expect(a).toEqual(b);
    expect(a.dx === c.dx && a.dy === c.dy).toBe(false);
  });

  it("keeps the image covering when panning (no empty edges)", () => {
    const r = kenBurnsDrawParams(1080, 1920, CW, CH, 1, 0.75);
    // drawn rect must still fully contain the canvas
    expect(r.dx).toBeLessThanOrEqual(1);
    expect(r.dy).toBeLessThanOrEqual(1);
    expect(r.dx + r.dw).toBeGreaterThanOrEqual(CW - 1);
    expect(r.dy + r.dh).toBeGreaterThanOrEqual(CH - 1);
  });
});
