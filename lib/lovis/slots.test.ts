import { describe, expect, it } from "vitest";
import {
  BASE_SLOTS,
  buildLoviHtml,
  describeSlots,
  LOVI_DATA_GLOBAL,
} from "./slots";

describe("buildLoviHtml", () => {
  it("injects window.LOVI_DATA as valid JSON with < escaped", () => {
    const data = { names: "María", note: "<b>hola</b>" };
    const html = buildLoviHtml("<html><body>x</body></html>", data);
    // raw < from the data must not appear in the payload
    expect(html).not.toContain("<b>");
    expect(html).toContain("\\u003c");
    const m = html.match(/window\.LOVI_DATA=(\{.*?\});<\/script>/);
    expect(m).not.toBeNull();
    expect(JSON.parse(m![1])).toEqual(data);
  });

  it("uses the LOVI_DATA_GLOBAL name for the injection", () => {
    const html = buildLoviHtml("<body>x</body>", {});
    expect(html).toContain(`window.${LOVI_DATA_GLOBAL}=`);
  });

  it("injects before </head> when the document has one", () => {
    const html = buildLoviHtml("<html><head></head><body></body></html>", {
      a: 1,
    });
    expect(html.indexOf("window.LOVI_DATA")).toBeLessThan(
      html.indexOf("</head>"),
    );
  });

  it("prepends the injection when there is no </head>", () => {
    const html = buildLoviHtml("<body>hola</body>", { a: 1 });
    expect(html.startsWith(`<script>window.${LOVI_DATA_GLOBAL}=`)).toBe(true);
  });

  it("round-trips nested data", () => {
    const data = {
      names: { from: "Juan", to: "María" },
      memories: ["la playa", "el café"],
    };
    const html = buildLoviHtml("<html></html>", data);
    const m = html.match(/window\.LOVI_DATA=(\{.*\});<\/script>/);
    expect(JSON.parse(m![1])).toEqual(data);
  });
});

describe("describeSlots", () => {
  it("formats the slot list for the code-generation prompt", () => {
    const out = describeSlots(BASE_SLOTS);
    expect(out).toContain("- names (names) [requerido]: Nombres");
    expect(out).toContain("- message (text): Mensaje principal");
    expect(out).toContain("- photos (photos[]): Fotos");
  });

  it("returns one line per slot", () => {
    const out = describeSlots(BASE_SLOTS);
    expect(out.split("\n")).toHaveLength(BASE_SLOTS.length);
  });
});
