// Minimal OpenRouter client. ALL AI in Poetry AI goes through here:
// text, images, video and voice. One API key: OPENROUTER_API_KEY.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Cheap default for Spanish emotional text generation (Phase 1). */
export const DEFAULT_TEXT_MODEL = "openai/gpt-4o-mini";

/** Stronger model for Lovi code generation (Phase 2). */
export const DEFAULT_CODE_MODEL = "anthropic/claude-sonnet-4";

export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://poetry-ai.app",
      "X-Title": "Poetry AI",
    },
    body: JSON.stringify({
      model: options.model ?? DEFAULT_TEXT_MODEL,
      messages,
      temperature: options.temperature ?? 0.9,
      max_tokens: options.maxTokens ?? 900,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenRouter returned an unexpected response shape");
  }
  return content;
}
