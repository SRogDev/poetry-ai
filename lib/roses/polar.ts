// Polar billing helpers — plain fetch against the Polar REST API, plus
// Standard Webhooks signature verification. No new npm dependencies.
//
// NOTE: imports use relative paths to the identical modules that `@/`
// points at, so the vitest suite can resolve them (vitest has no
// tsconfig-paths plugin configured).

import { createHmac, timingSafeEqual } from "node:crypto";

export interface PolarWebhookHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

const TIMESTAMP_TOLERANCE_SEC = 5 * 60;

/**
 * Verify a Polar webhook using the Standard Webhooks scheme:
 * signed content = `${webhook-id}.${webhook-timestamp}.${rawBody}`,
 * HMAC-SHA256 with the base64-decoded webhook secret (leading `whsec_`
 * stripped), compared against each `v1,<base64>` candidate in the
 * `webhook-signature` header using a timing-safe comparison.
 * Also enforces a ±5 minute timestamp tolerance (replay protection).
 */
export function verifyPolarWebhook(
  rawBody: string,
  headers: PolarWebhookHeaders,
  secret: string,
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !secret) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > TIMESTAMP_TOLERANCE_SEC) return false;

  let key: Buffer;
  try {
    key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  } catch {
    return false;
  }
  if (key.length === 0) return false;

  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest();

  const candidates = signature.split(/\s+/).filter(Boolean);
  return candidates.some((candidate) => {
    const b64 = candidate.startsWith("v1,") ? candidate.slice(3) : candidate;
    let buf: Buffer;
    try {
      buf = Buffer.from(b64, "base64");
    } catch {
      return false;
    }
    return buf.length === expected.length && timingSafeEqual(buf, expected);
  });
}

function polarBaseUrl(): string {
  return (process.env.POLAR_API_URL ?? "https://api.polar.sh").replace(/\/+$/, "");
}

function polarHeaders(): Record<string, string> {
  const token = process.env.POLAR_ACCESS_TOKEN;
  if (!token) {
    throw new Error("roses: POLAR_ACCESS_TOKEN is not set — billing calls are unavailable.");
  }
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

/** Minimal Polar customer shape we care about. */
export interface PolarCustomer {
  externalId?: string | null;
}

/** GET /v1/customers/{id} — used to resolve a customer id to our user id. */
export async function getPolarCustomer(customerId: string): Promise<PolarCustomer | null> {
  const res = await fetch(`${polarBaseUrl()}/v1/customers/${encodeURIComponent(customerId)}`, {
    headers: polarHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`roses: polar customer lookup failed (HTTP ${res.status})`);
  }
  const json = (await res.json()) as { externalId?: string | null; external_id?: string | null };
  return { externalId: json?.externalId ?? json?.external_id ?? null };
}

export interface CreateCheckoutOptions {
  productId: string;
  /** Our app user id — becomes the Polar customer's externalId. */
  userId: string;
  successUrl?: string;
}

/**
 * POST /v1/checkouts — creates a Polar checkout session for a product.
 * The user id is passed as `externalCustomerId` so webhooks can map the
 * Polar customer back to the app user.
 */
export async function createPolarCheckout(
  opts: CreateCheckoutOptions,
): Promise<{ id: string; url: string }> {
  const res = await fetch(`${polarBaseUrl()}/v1/checkouts`, {
    method: "POST",
    headers: polarHeaders(),
    body: JSON.stringify({
      products: [opts.productId],
      externalCustomerId: opts.userId,
      ...(opts.successUrl ? { successUrl: opts.successUrl } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`roses: polar checkout failed (HTTP ${res.status}) ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { id?: string; url?: string };
  if (!json?.url) {
    throw new Error("roses: polar checkout response did not include a url");
  }
  return { id: json.id ?? "", url: json.url };
}
