// OpenRouter client — ALL AI in Poetry AI goes through here.
// Text (chat completions), images (Images API), voice (audio-output chat
// models), music (audio-output music models). One API key: OPENROUTER_API_KEY.
//
// Conventions:
// - Model IDs are env-overridable with cheap defaults (see BUILD.md).
// - Every call retries transient failures (429/5xx/network) with backoff.
// - Every call logs model + token usage for cost tracking.
// - `setFetchImpl` lets tests inject a mock HTTP layer (no network in tests).

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Override fetch (tests). */
  fetchImpl?: typeof fetch;
}

const CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const IMAGES_URL = "https://openrouter.ai/api/v1/images";

export const DEFAULT_TEXT_MODEL =
  process.env.OPENROUTER_TEXT_MODEL || "google/gemini-3.1-flash-lite";
export const DEFAULT_CODE_MODEL =
  process.env.OPENROUTER_CODE_MODEL || "anthropic/claude-sonnet-4";
export const DEFAULT_IMAGE_MODEL =
  process.env.OPENROUTER_IMAGE_MODEL || "black-forest-labs/flux.2-klein-4b";
export const DEFAULT_TTS_MODEL =
  process.env.OPENROUTER_TTS_MODEL || "openai/gpt-audio-mini";
export const DEFAULT_TTS_VOICE = process.env.OPENROUTER_TTS_VOICE || "coral";
export const DEFAULT_MUSIC_MODEL =
  process.env.OPENROUTER_MUSIC_MODEL || "google/lyria-3-clip-preview";

function apiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is not set — add it to your environment (see .env.example).",
    );
  }
  return key;
}

function baseHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey()}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://poetry-ai.app",
    "X-Title": "Poetry AI",
  };
}

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface FetchOpts {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  retries?: number;
  label?: string;
}

/** POST JSON with timeout + retries on transient failures. */
async function postJson(
  url: string,
  body: unknown,
  opts: FetchOpts = {},
): Promise<unknown> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const retries = opts.retries ?? 2;
  const label = opts.label ?? "openrouter";

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const err = new Error(
          `${label} error ${res.status}: ${text.slice(0, 300)}`,
        ) as Error & { status?: number };
        err.status = res.status;
        if (RETRYABLE.has(res.status) && attempt < retries) {
          lastError = err;
          await sleep(500 * 2 ** attempt);
          continue;
        }
        throw err;
      }
      const data = (await res.json()) as {
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };
      if (data.usage) {
        console.info(
          JSON.stringify({
            provider: "openrouter",
            op: label,
            prompt_tokens: data.usage.prompt_tokens ?? 0,
            completion_tokens: data.usage.completion_tokens ?? 0,
            total_tokens: data.usage.total_tokens ?? 0,
          }),
        );
      }
      return data;
    } catch (e) {
      clearTimeout(timer);
      const retryable =
        e instanceof Error &&
        ((e as Error & { status?: number }).status === undefined || // network/abort
          RETRYABLE.has((e as Error & { status?: number }).status ?? 0));
      if (retryable && attempt < retries) {
        lastError = e;
        await sleep(500 * 2 ** attempt);
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}

function firstChoiceText(data: unknown): string {
  const d = data as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = d.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new Error("OpenRouter returned an unexpected response shape");
  }
  return content;
}

function firstChoiceAudio(data: unknown): string {
  const d = data as {
    choices?: Array<{ message?: { audio?: { data?: unknown } } }>;
  };
  const audio = d.choices?.[0]?.message?.audio?.data;
  if (typeof audio !== "string" || audio.length === 0) {
    throw new Error(
      "OpenRouter audio model returned no audio — the model may not support audio output",
    );
  }
  return audio;
}

/** Plain chat completion → assistant text. */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<string> {
  const data = await postJson(
    CHAT_URL,
    {
      model: options.model ?? DEFAULT_TEXT_MODEL,
      messages,
      temperature: options.temperature ?? 0.9,
      max_tokens: options.maxTokens ?? 900,
    },
    { fetchImpl: options.fetchImpl, label: "chat" },
  );
  return firstChoiceText(data);
}

/** Chat completion that must return JSON — strips fences, throws on bad shape. */
export async function chatJSON<T = unknown>(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<T> {
  const raw = await chat(
    [
      ...messages.slice(0, -1),
      {
        ...messages[messages.length - 1],
        content:
          messages[messages.length - 1].content +
          "\n\nResponde ÚNICAMENTE con el JSON pedido, sin texto extra ni markdown.",
      },
    ],
    { ...options, temperature: options.temperature ?? 0.3 },
  );
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(
      `OpenRouter did not return valid JSON: ${cleaned.slice(0, 200)}`,
    );
  }
}

export interface ImageOptions {
  model?: string;
  fetchImpl?: typeof fetch;
}

/** Generate a romantic background image → data URI (PNG). */
export async function generateImage(
  prompt: string,
  options: ImageOptions = {},
): Promise<string> {
  const data = (await postJson(
    IMAGES_URL,
    { model: options.model ?? DEFAULT_IMAGE_MODEL, prompt },
    { fetchImpl: options.fetchImpl, timeoutMs: 120_000, label: "image" },
  )) as { data?: Array<{ b64_json?: string }> };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenRouter Images API returned no image data");
  }
  return `data:image/png;base64,${b64}`;
}

export interface TtsOptions {
  model?: string;
  voice?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Spanish narration via an audio-output chat model.
 * Sends modalities=["text","audio"] + audio voice params (OpenAI-style).
 * Returns an MP3 data URI. Throws a clear error when the model can't do audio
 * (callers must degrade gracefully — video works without voiceover).
 */
export async function tts(
  text: string,
  options: TtsOptions = {},
): Promise<string> {
  const data = await postJson(
    CHAT_URL,
    {
      model: options.model ?? DEFAULT_TTS_MODEL,
      modalities: ["text", "audio"],
      audio: { voice: options.voice ?? DEFAULT_TTS_VOICE, format: "mp3" },
      messages: [
        {
          role: "system",
          content:
            "Eres una voz cálida que recita dedicatorias de amor en español latinoamericano neutro. Recita con emoción contenida, pausas naturales y ternura. Solo recita el texto dado.",
        },
        { role: "user", content: text },
      ],
      max_tokens: 4000,
    },
    { fetchImpl: options.fetchImpl, timeoutMs: 120_000, label: "tts" },
  );
  return `data:audio/mp3;base64,${firstChoiceAudio(data)}`;
}

export interface MusicOptions {
  model?: string;
  fetchImpl?: typeof fetch;
}

/**
 * AI instrumental music theme (e.g. Lyria 3 clip, ~30s).
 * Returns an MP3 data URI. Purely instrumental — OpenRouter has no
 * vocal-singing model, so "songs" are theme + recitation (see /api/poetry/song).
 */
export async function generateMusic(
  prompt: string,
  options: MusicOptions = {},
): Promise<string> {
  const data = await postJson(
    CHAT_URL,
    {
      model: options.model ?? DEFAULT_MUSIC_MODEL,
      modalities: ["text", "audio"],
      messages: [
        {
          role: "system",
          content:
            "Genera un tema musical instrumental romántico de 30 segundos según la descripción.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 4000,
    },
    { fetchImpl: options.fetchImpl, timeoutMs: 180_000, label: "music" },
  );
  return `data:audio/mp3;base64,${firstChoiceAudio(data)}`;
}
