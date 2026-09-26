// Tests for the Emotion Engine pipeline — chat is fully mocked.
import { describe, expect, it } from "vitest";
import {
  runEmotionEngine,
  splitLines,
  type ChatFn,
} from "./emotion-engine";
import { parseIntent } from "./prompts/intent";
import { parseVerdict } from "./prompts/critic";

const INTENT = JSON.stringify({
  emotions: ["ternura", "nostalgia"],
  intensity: 2,
  occasion: "aniversario",
  relationship: "pareja",
  register: "íntimo",
  summary: "quiere conmoverla con un recuerdo",
});

function verdict(score: number) {
  return JSON.stringify({ score, feedback: "feedback" });
}

/** Scripted chat: intent → (draft, verdict)* */
function scripted(drafts: Array<{ text: string; score: number }>): ChatFn {
  let step = 0;
  return async (messages) => {
    const sys = messages[0]?.content ?? "";
    if (sys.includes("intención emocional") || sys.includes("intention")) {
      return INTENT;
    }
    if (sys.includes("crític") || sys.includes("Evalúa")) {
      const d = drafts[Math.min(step, drafts.length - 1)];
      step++;
      return verdict(d.score);
    }
    return drafts[Math.min(step, drafts.length - 1)].text;
  };
}

describe("parseIntent", () => {
  it("parses a valid intent JSON", () => {
    const intent = parseIntent(INTENT);
    expect(intent.emotions).toEqual(["ternura", "nostalgia"]);
    expect(intent.intensity).toBe(2);
    expect(intent.occasion).toBe("aniversario");
  });

  it("defaults sanely on missing fields", () => {
    const intent = parseIntent("{}");
    expect(intent.emotions).toEqual(["ternura"]);
    expect(intent.intensity).toBe(2);
  });
});

describe("parseVerdict", () => {
  it("clamps the score to 1-10", () => {
    expect(parseVerdict('{"score": 99}').score).toBe(10);
    expect(parseVerdict('{"score": -3}').score).toBe(1);
  });
});

describe("splitLines", () => {
  it("splits and strips tone markers", () => {
    expect(splitLines("[tierno] Hola\n\n[intenso] Adiós\n")).toEqual([
      "Hola",
      "Adiós",
    ]);
  });
});

describe("runEmotionEngine", () => {
  it("accepts the first draft when the critic scores >= 8", async () => {
    const chatFn = scripted([{ text: "poema hermoso", score: 9 }]);
    const res = await runEmotionEngine({
      brief: "quiero que llore de felicidad",
      recipient: { name: "Ana" },
      format: "poem",
      chatFn,
    });
    expect(res.output).toBe("poema hermoso");
    expect(res.score).toBe(9);
    expect(res.iterations).toBe(1);
    expect(res.intent.emotions).toContain("ternura");
  });

  it("revises until the critic passes, keeping the best draft", async () => {
    const chatFn = scripted([
      { text: "borrador flojo", score: 5 },
      { text: "borrador mejorado", score: 8 },
    ]);
    const res = await runEmotionEngine({
      brief: "perdón para mi papá",
      recipient: { name: "Papá", notes: "le gusta el dominó" },
      format: "letter",
      chatFn,
    });
    expect(res.iterations).toBe(2);
    expect(res.output).toBe("borrador mejorado");
    expect(res.score).toBe(8);
  });

  it("stops after 3 iterations and returns the best draft", async () => {
    const chatFn = scripted([
      { text: "uno", score: 4 },
      { text: "dos", score: 6 },
      { text: "tres", score: 5 },
    ]);
    const res = await runEmotionEngine({
      brief: "x",
      recipient: { name: "Ana" },
      format: "quote",
      chatFn,
    });
    expect(res.iterations).toBe(3);
    expect(res.output).toBe("dos");
    expect(res.score).toBe(6);
  });

  it("honors an explicit emotionTarget and intensity", async () => {
    let seenTarget = "";
    const chatFn: ChatFn = async (messages) => {
      const all = messages.map((m) => m.content).join("\n");
      if (all.includes("intención emocional")) return INTENT;
      if (all.includes("Crítica emocional") || all.includes("Evalúa"))
        return verdict(9);
      seenTarget = all;
      return "poema";
    };
    await runEmotionEngine({
      brief: "x",
      recipient: { name: "Ana" },
      format: "poem",
      emotionTarget: "melancolía dulce",
      intensity: 3,
      chatFn,
    });
    expect(seenTarget).toContain("melancolía dulce");
    expect(seenTarget).toContain("3 (devastador)");
  });
});
