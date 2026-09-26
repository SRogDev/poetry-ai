// Supermemory — the memory layer of Poetry AI (hosted API).
// Two jobs:
//   1. Conversation memory: what the user asked, what was generated.
//   2. Person memory: per-recipient long-term memory (psychology profile,
//      past dedications, shared memories) — containerTag = `person:<recipient_id>`.
//
// Graceful degradation: if SUPERMEMORY_API_KEY is absent (or the API fails),
// remember() is a no-op and recall() returns [] — the Emotion Engine works
// without memory, just with less context.

const API_BASE = "https://api.supermemory.ai";

export function isConfigured(): boolean {
  return Boolean(process.env.SUPERMEMORY_API_KEY);
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.SUPERMEMORY_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export interface RememberOptions {
  /** Raw content to remember (a chat exchange, a dedication summary, a fact). */
  content: string;
  /** Memory scope: `user:<id>` for conversation, `person:<recipient_id>` for people. */
  containerTag: string;
  metadata?: Record<string, string>;
}

export interface RecallOptions {
  query: string;
  containerTag: string;
  limit?: number;
  fetchImpl?: typeof fetch;
}

/** Store a memory. Fire-and-forget from chat/dedication events — never throws. */
export async function remember(options: RememberOptions): Promise<void> {
  if (!isConfigured()) return;
  try {
    const res = await fetch(`${API_BASE}/v3/documents`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        content: options.content,
        containerTag: options.containerTag,
        metadata: options.metadata,
      }),
    });
    if (!res.ok) {
      console.warn(
        `[supermemory] remember failed: ${res.status} ${await res.text().catch(() => "")}`,
      );
    }
  } catch (e) {
    console.warn(`[supermemory] remember error: ${(e as Error).message}`);
  }
}

/** Recall relevant memories for a new brief (enriches the Emotion Engine). */
export async function recall(options: RecallOptions): Promise<string[]> {
  if (!isConfigured()) return [];
  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const res = await fetchImpl(`${API_BASE}/v4/search`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        q: options.query,
        containerTag: options.containerTag,
        searchMode: "hybrid",
        limit: options.limit ?? 5,
      }),
    });
    if (!res.ok) {
      console.warn(`[supermemory] recall failed: ${res.status}`);
      return [];
    }
    const data = (await res.json()) as {
      results?: Array<{ content?: string; chunks?: Array<{ content?: string }> }>;
    };
    const out: string[] = [];
    for (const r of data.results ?? []) {
      if (r.content) out.push(r.content);
      else if (r.chunks) for (const c of r.chunks) if (c.content) out.push(c.content);
    }
    return out.slice(0, options.limit ?? 5);
  } catch (e) {
    console.warn(`[supermemory] recall error: ${(e as Error).message}`);
    return [];
  }
}

/** Container tag for a recipient's long-term memory. */
export function personTag(recipientId: string): string {
  return `person:${recipientId}`;
}

/** Container tag for a user's conversation memory. */
export function userTag(userId: string): string {
  return `user:${userId}`;
}
