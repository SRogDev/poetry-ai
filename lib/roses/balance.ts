// Roses 🌹 — the single unit of value in Poetry AI.
//
// Reads go through RLS (profiles.roses_balance). Mutations MUST use the
// service-role Supabase client + the atomic RPCs from db.sql, which append to
// roses_ledger and update the cached balance together.
//
// NOTE: imports below use relative paths to the identical modules that `@/`
// points at, so the vitest suite can resolve them (vitest has no
// tsconfig-paths plugin configured).

// Same module as `@/lib/supabase/server`.
import { createClient } from "../supabase/server";
// Same module as `@/lib/supabase/service-role` (coordinator-owned, server-only).
import { createServiceRoleClient } from "../supabase/service-role";

// Pricing lives in the client-safe ./costs module (re-exported here so
// existing server imports keep working).
export {
  ROSE_COSTS,
  SIGNUP_BONUS_ROSES,
  MONTHLY_GRANT_ROSES,
} from "./costs";

/**
 * Thrown when a spend fails because the balance is too low.
 * Carries the best-effort balance at failure time (`null` when unknown).
 */
export class InsufficientRosesError extends Error {
  readonly balance: number | null;
  constructor(balance: number | null = null) {
    super("insufficient_roses");
    this.name = "InsufficientRosesError";
    this.balance = balance;
  }
}

/** Read the cached balance for a user (RLS: own row). */
export async function getBalance(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("roses_balance")
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new Error(`roses.getBalance: ${error?.message ?? "profile not found"}`);
  }
  return data.roses_balance as number;
}

function isInsufficientRoses(error: { message?: string } | null): boolean {
  return (error?.message ?? "").includes("insufficient_roses");
}

/**
 * Spend roses atomically via the `spend_roses` RPC (check + debit in one
 * statement, so concurrent spends can never overdraw). Throws
 * `InsufficientRosesError` when the balance is too low.
 */
export async function spendRoses(
  userId: string,
  amount: number,
  reason: string,
  ref?: string,
): Promise<number> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("spend_roses", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_ref: ref ?? null,
  });

  if (error) {
    if (isInsufficientRoses(error)) {
      // Best-effort balance for the 402 response; null when the read fails.
      let balance: number | null = null;
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("roses_balance")
          .eq("id", userId)
          .single();
        balance = (profile?.roses_balance as number | undefined) ?? null;
      } catch {
        balance = null;
      }
      throw new InsufficientRosesError(balance);
    }
    throw new Error(`roses.spendRoses: ${error.message}`);
  }
  return data as number;
}

/** Grant roses (subscription cycle, top-up, rewards) via `add_roses`. Positive delta. */
export async function grantRoses(
  userId: string,
  amount: number,
  reason: string,
  ref?: string,
): Promise<number> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("add_roses", {
    p_user_id: userId,
    p_delta: amount,
    p_reason: reason,
    p_ref: ref ?? null,
  });

  if (error) {
    throw new Error(`roses.grantRoses: ${error.message}`);
  }
  return data as number;
}
