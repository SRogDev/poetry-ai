import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { grantRoses } from "@/lib/roses/balance";
import { getPolarCustomer, verifyPolarWebhook } from "@/lib/roses/polar";

/**
 * POST /api/webhooks/polar — Polar webhook receiver.
 *
 * Handled events:
 *  - `subscription.cycled` → grants POLAR_MONTHLY_ROSES (default 100) roses, reason `subscription`
 *  - `order.paid`          → grants POLAR_TOPUP_ROSES (default 50, or `metadata.roses`
 *                             when the product sets it) roses, reason `topup`
 *  - anything else         → 200 { received: true, ignored: true }
 *
 * Idempotency: every event id is claimed in `polar_events` first; a duplicate
 * delivery hits the primary-key conflict and returns { received: true, deduped: true }.
 *
 * The Polar customer is mapped back to the app user via the customer's
 * `externalId` (= our auth user id, set at checkout time). When the event only
 * carries a customer id, it is resolved through the Polar REST API.
 */

interface PolarEventData {
  customer?: { externalId?: string | null } | string | null;
  customerExternalId?: string | null;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
}

interface PolarEvent {
  id: string;
  type: string;
  data: PolarEventData;
}

function envInt(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}

async function resolveUserId(event: PolarEvent): Promise<string | null> {
  const data = event.data ?? {};
  const customer = data.customer;

  if (customer && typeof customer === "object" && customer.externalId) {
    return customer.externalId;
  }
  if (typeof data.customerExternalId === "string" && data.customerExternalId) {
    return data.customerExternalId;
  }
  const metaUserId = data.metadata?.user_id;
  if (typeof metaUserId === "string" && metaUserId) {
    return metaUserId;
  }
  if (typeof customer === "string" && customer) {
    // Customer arrived as an id — resolve it via the Polar API to read externalId.
    const resolved = await getPolarCustomer(customer);
    return resolved?.externalId ?? null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (process.env.POLAR_ENABLED !== "true") {
    return NextResponse.json(
      { error: "billing_disabled", message: "Las suscripciones aún no están activas" },
      { status: 503 },
    );
  }

  const rawBody = await req.text();
  const verified = verifyPolarWebhook(
    rawBody,
    {
      id: req.headers.get("webhook-id"),
      timestamp: req.headers.get("webhook-timestamp"),
      signature: req.headers.get("webhook-signature"),
    },
    process.env.POLAR_WEBHOOK_SECRET ?? "",
  );
  if (!verified) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  let event: PolarEvent;
  try {
    event = JSON.parse(rawBody) as PolarEvent;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  if (!event?.id || !event?.type) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Idempotency claim — a retry of an already-seen event hits the PK conflict.
  const { error: insertError } = await supabase.from("polar_events").insert({
    event_id: event.id,
    type: event.type,
    payload: event as unknown as Record<string, unknown>,
  });
  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ received: true, deduped: true });
    }
    console.error("roses: polar_events insert failed:", insertError.message);
    return NextResponse.json({ error: "idempotency_failed" }, { status: 500 });
  }

  switch (event.type) {
    case "subscription.cycled": {
      const userId = await resolveUserId(event);
      if (!userId) {
        console.warn(`roses: ${event.type} without mappable user (event ${event.id})`);
        return NextResponse.json({ received: true, ignored: true, reason: "no_user" });
      }
      const amount = envInt("POLAR_MONTHLY_ROSES", 100);
      await grantRoses(userId, amount, "subscription", event.id);
      return NextResponse.json({ received: true, granted: amount });
    }

    case "order.paid": {
      const userId = await resolveUserId(event);
      if (!userId) {
        console.warn(`roses: ${event.type} without mappable user (event ${event.id})`);
        return NextResponse.json({ received: true, ignored: true, reason: "no_user" });
      }
      const metaRoses = Number(event.data?.metadata?.roses);
      const amount =
        Number.isFinite(metaRoses) && metaRoses > 0
          ? Math.floor(metaRoses)
          : envInt("POLAR_TOPUP_ROSES", 50);
      await grantRoses(userId, amount, "topup", event.id);
      return NextResponse.json({ received: true, granted: amount });
    }

    default:
      return NextResponse.json({ received: true, ignored: true });
  }
}
