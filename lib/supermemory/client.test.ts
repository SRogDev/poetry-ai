// Tests for the Supermemory client — graceful degradation, no network.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { isConfigured, recall, remember } from "./client";

const OLD_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...OLD_ENV };
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = OLD_ENV;
});

describe("without SUPERMEMORY_API_KEY", () => {
  it("isConfigured() is false", () => {
    delete process.env.SUPERMEMORY_API_KEY;
    expect(isConfigured()).toBe(false);
  });

  it("recall returns [] without touching the network", async () => {
    delete process.env.SUPERMEMORY_API_KEY;
    const fetchImpl = vi.fn();
    const out = await recall({
      query: "x",
      containerTag: "person:1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("remember is a no-op", async () => {
    delete process.env.SUPERMEMORY_API_KEY;
    await expect(
      remember({ content: "x", containerTag: "person:1" }),
    ).resolves.toBeUndefined();
  });
});

describe("with SUPERMEMORY_API_KEY", () => {
  it("recall parses search results", async () => {
    process.env.SUPERMEMORY_API_KEY = "sm-key";
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          results: [{ content: "le gusta el café" }, { content: "odía el frío" }],
        }),
        { status: 200 },
      ),
    );
    const out = await recall({
      query: "qué le gusta",
      containerTag: "person:1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out).toEqual(["le gusta el café", "odía el frío"]);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toContain("/v4/search");
    expect(JSON.parse(init.body as string).containerTag).toBe("person:1");
  });

  it("recall returns [] on API failure (never throws)", async () => {
    process.env.SUPERMEMORY_API_KEY = "sm-key";
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });
    const out = await recall({
      query: "x",
      containerTag: "person:1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out).toEqual([]);
  });

  it("remember posts to /v3/documents and never throws on failure", async () => {
    process.env.SUPERMEMORY_API_KEY = "sm-key";
    const realFetch = globalThis.fetch;
    const post = vi.fn(async () => new Response("{}", { status: 200 }));
    (globalThis as { fetch: unknown }).fetch = post;
    await remember({ content: "hola", containerTag: "user:1" });
    const [url, init] = post.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toContain("/v3/documents");
    expect(JSON.parse(init.body as string).containerTag).toBe("user:1");
    (globalThis as { fetch: unknown }).fetch = realFetch;

    // failure path: must not throw
    const failing = vi.fn(async () => {
      throw new Error("down");
    });
    (globalThis as { fetch: unknown }).fetch = failing;
    await expect(
      remember({ content: "hola", containerTag: "user:1" }),
    ).resolves.toBeUndefined();
    (globalThis as { fetch: unknown }).fetch = realFetch;
  });
});
