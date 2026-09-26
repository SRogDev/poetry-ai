// Tests for lib/openrouter/client.ts — all HTTP is mocked via fetchImpl.
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  chat,
  chatJSON,
  generateImage,
  tts,
  generateMusic,
} from "./client";

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-key";
  vi.restoreAllMocks();
});

function mockFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  return vi.fn(async (url: string, init?: RequestInit) =>
    handler(url, init ?? {}),
  ) as unknown as typeof fetch;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const chatOk = (content: string) =>
  jsonResponse({
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  });

describe("chat", () => {
  it("returns the assistant text", async () => {
    const fetchImpl = mockFetch(() => chatOk("hola mundo"));
    const out = await chat([{ role: "user", content: "hi" }], { fetchImpl });
    expect(out).toBe("hola mundo");
  });

  it("sends the API key and model", async () => {
    const fetchImpl = mockFetch((url, init) => {
      expect(url).toContain("openrouter.ai");
      expect((init.headers as Record<string, string>)["Authorization"]).toBe(
        "Bearer test-key",
      );
      const body = JSON.parse(init.body as string);
      expect(body.model).toBe("google/gemini-3.1-flash-lite");
      return chatOk("ok");
    });
    await chat([{ role: "user", content: "hi" }], { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries transient 500s then succeeds", async () => {
    let n = 0;
    const fetchImpl = mockFetch(() => {
      n++;
      return n === 1 ? jsonResponse({ error: "boom" }, 500) : chatOk("recovered");
    });
    const out = await chat([{ role: "user", content: "hi" }], { fetchImpl });
    expect(out).toBe("recovered");
    expect(n).toBe(2);
  });

  it("does not retry client errors (400)", async () => {
    let n = 0;
    const fetchImpl = mockFetch(() => {
      n++;
      return jsonResponse({ error: "bad" }, 400);
    });
    await expect(
      chat([{ role: "user", content: "hi" }], { fetchImpl }),
    ).rejects.toThrow("400");
    expect(n).toBe(1);
  });

  it("throws a clear error when the API key is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const fetchImpl = mockFetch(() => chatOk("x"));
    await expect(
      chat([{ role: "user", content: "hi" }], { fetchImpl }),
    ).rejects.toThrow("OPENROUTER_API_KEY");
  });
});

describe("chatJSON", () => {
  it("parses JSON wrapped in fences", async () => {
    const fetchImpl = mockFetch(() =>
      chatOk('```json\n{"score": 8, "feedback": "bien"}\n```'),
    );
    const out = await chatJSON<{ score: number }>(
      [{ role: "user", content: "evalúa" }],
      { fetchImpl },
    );
    expect(out.score).toBe(8);
  });

  it("throws on invalid JSON", async () => {
    const fetchImpl = mockFetch(() => chatOk("no es json {"));
    await expect(
      chatJSON([{ role: "user", content: "x" }], { fetchImpl }),
    ).rejects.toThrow("valid JSON");
  });
});

describe("generateImage", () => {
  it("returns a PNG data URI from b64_json", async () => {
    const fetchImpl = mockFetch((url) => {
      expect(url).toContain("/images");
      return jsonResponse({ data: [{ b64_json: "aGVsbG8=" }] });
    });
    const out = await generateImage("romantic sunset", { fetchImpl });
    expect(out).toBe("data:image/png;base64,aGVsbG8=");
  });

  it("throws when no image data comes back", async () => {
    const fetchImpl = mockFetch(() => jsonResponse({ data: [] }));
    await expect(generateImage("x", { fetchImpl })).rejects.toThrow(
      "no image data",
    );
  });
});

describe("tts", () => {
  it("returns an MP3 data URI from audio data", async () => {
    const fetchImpl = mockFetch(() =>
      jsonResponse({
        choices: [{ message: { audio: { data: "QUJD" } } }],
        usage: { prompt_tokens: 5, completion_tokens: 50, total_tokens: 55 },
      }),
    );
    const out = await tts("te amo", { fetchImpl });
    expect(out).toBe("data:audio/mp3;base64,QUJD");
  });

  it("throws a clear error when the model returns no audio", async () => {
    const fetchImpl = mockFetch(() => chatOk("solo texto, sin audio"));
    await expect(tts("te amo", { fetchImpl })).rejects.toThrow(
      "no audio",
    );
  });
});

describe("generateMusic", () => {
  it("returns an MP3 data URI from audio data", async () => {
    const fetchImpl = mockFetch(() =>
      jsonResponse({ choices: [{ message: { audio: { data: "TVVTSUM=" } } }] }),
    );
    const out = await generateMusic("romantic piano theme", { fetchImpl });
    expect(out).toBe("data:audio/mp3;base64,TVVTSUM=");
  });
});
