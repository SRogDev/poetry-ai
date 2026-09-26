/**
 * GET /api/billing/checkout?product=<polar_product_id> (auth) → { url }
 *
 * Creates a Polar checkout session for the given product and returns the
 * hosted checkout URL. When POLAR_ENABLED !== "true", billing is disabled and
 * this returns 503.
 *
 * ── POLAR SETUP — what Roger must configure on dashboard.polar.sh ──────────
 * 1. PRODUCTS: create the products to sell and copy each product's id (uuid):
 *      - Subscription products for the paid tiers (e.g. Plus / Pro). Attach a
 *        "Meter Credits" benefit on the meter named exactly `roses` if you want
 *        Polar-side usage tracking (the app gates generation itself; Polar
 *        never blocks overuse).
 *      - One-time products for rose top-up packs. To grant a custom amount of
 *        roses per purchase, set the product's metadata key `roses` to the
 *        number (the `order.paid` webhook prefers `metadata.roses`; otherwise
 *        it grants POLAR_TOPUP_ROSES).
 *    Pass the chosen product id as `?product=<id>` when calling this endpoint.
 * 2. WEBHOOK: add an endpoint with URL `https://<app>/api/webhooks/polar`
 *    (replace <app> with the production domain), subscribed to the events
 *    `subscription.cycled` and `order.paid`. Copy the endpoint's signing
 *    secret → env POLAR_WEBHOOK_SECRET (format `whsec_...`).
 * 3. METER (optional): create a meter named exactly `roses` with Sum
 *    aggregation if you attach Meter Credits benefits to products.
 * 4. ENV VARS (server):
 *      POLAR_ENABLED=true            — master switch; keep "false"/unset until
 *                                      the payout account is verified
 *      POLAR_ACCESS_TOKEN            — Polar organization access token
 *      POLAR_WEBHOOK_SECRET          — signing secret from step 2
 *      NEXT_PUBLIC_APP_URL           — e.g. https://poetry-ai.vercel.app
 *                                      (used for the checkout success_url)
 *      POLAR_MONTHLY_ROSES=100       — roses granted on subscription.cycled
 *      POLAR_TOPUP_ROSES=50          — roses granted on order.paid
 *      POLAR_API_URL                 — default https://api.polar.sh;
 *                                      use https://sandbox-api.polar.sh to test
 * 5. MAPPING: the checkout sends `externalCustomerId` = the app's auth user id,
 *    which becomes the Polar customer's `externalId`. The webhook uses it to
 *    credit the right user — do not change or strip it.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPolarCheckout } from "@/lib/roses/polar";

/** GET /api/billing/checkout?product=<id> (auth) → { url } */
export async function GET(req: NextRequest) {
  if (process.env.POLAR_ENABLED !== "true") {
    return NextResponse.json(
      { error: "billing_disabled", message: "Las suscripciones aún no están activas" },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const productId = req.nextUrl.searchParams.get("product");
  if (!productId) {
    return NextResponse.json({ error: "missing_product" }, { status: 400 });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");

  try {
    const { url } = await createPolarCheckout({
      productId,
      userId: user.id,
      successUrl: appUrl ? `${appUrl}/cuenta?billing=success` : undefined,
    });
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json(
      { error: "checkout_failed", message: (e as Error).message },
      { status: 502 },
    );
  }
}
