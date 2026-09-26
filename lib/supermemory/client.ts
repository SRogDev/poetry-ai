// Supermemory — the memory layer of Poetry AI (hosted API).
// Two jobs:
//   1. Conversation memory: what the user asked, what was generated.
//   2. Person memory: per-recipient long-term memory (psychology profile,
//      past dedications, shared memories) — containerTag = `person:<recipient_id>`.
//
// Phase 1: implement against the Supermemory REST API (memories + search).

const BASE_URL = "https://api.supermemory.ai/v3";

function apiKey(): string {
  const key = process.env.SUPERMEMORY_API_KEY;
  if (!key) throw new Error("SUPERMEMORY_API_KEY is not set");
  return key;
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
}

/** Store a memory. Fire-and-forget from chat/dedication events. */
export async function remember(options: RememberOptions): Promise<void> {
  apiKey();
  // TODO Phase 1: POST {BASE_URL}/memories { content, containerTag, metadata }
  throw new Error(
    `Supermemory.remember -> ${BASE_URL}: not implemented (Phase 1) [${options.containerTag}]`,
  );
}

/** Recall relevant memories for a new brief (enriches the Emotion Engine). */
export async function recall(options: RecallOptions): Promise<string[]> {
  apiKey();
  // TODO Phase 1: POST {BASE_URL}/search { q, containerTag, limit } → string[]
  throw new Error(
    `Supermemory.recall -> ${BASE_URL}: not implemented (Phase 1) [${options.containerTag}]`,
  );
}

/** Container tag for a recipient's long-term memory. */
export function personTag(recipientId: string): string {
  return `person:${recipientId}`;
}

/** Container tag for a user's conversation memory. */
export function userTag(userId: string): string {
  return `user:${userId}`;
}
