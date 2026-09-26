import { describe, expect, it } from "vitest";
import { canNativeShare } from "./canShare";

describe("canNativeShare", () => {
  const file = new File(["x"], "video.mp4", { type: "video/mp4" });

  it("returns true when navigator.canShare accepts the files", () => {
    const nav = { canShare: () => true } as unknown as Navigator;
    expect(canNativeShare(file, nav)).toBe(true);
  });

  it("returns false when canShare rejects", () => {
    const nav = { canShare: () => false } as unknown as Navigator;
    expect(canNativeShare(file, nav)).toBe(false);
  });

  it("returns false when canShare is missing", () => {
    const nav = {} as unknown as Navigator;
    expect(canNativeShare(file, nav)).toBe(false);
  });

  it("returns false without a navigator (SSR/node)", () => {
    expect(canNativeShare(file, undefined)).toBe(false);
  });

  it("returns false without a file", () => {
    const nav = { canShare: () => true } as unknown as Navigator;
    expect(canNativeShare(null, nav)).toBe(false);
  });
});
