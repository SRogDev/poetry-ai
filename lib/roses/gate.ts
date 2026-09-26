// Roses spend-gate: monthly grant → spend → generate.
//
// NOTE: imports use relative paths to the identical modules that `@/`
// points at, so the vitest suite can resolve them (vitest has no
// tsconfig-paths plugin configured).

// Same module as `@/lib/supabase/service-role` (coordinator-owned, server-only).
import { createServiceRoleClient } from "../supabase/service-role";
import { spendRoses } from "./balance";

/**
 * Pure helper: first day of the month for a date, as `YYYY-MM-DD` (UTC).
 * Mirrors the `date_trunc('month', now())::date` logic in db.sql's
 * `ensure_monthly_grant`.
 */
export function monthStart(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/**
 * Run the idempotent monthly free grant (20 roses, one per calendar month).
 * No-ops when this month's grant was already issued. Returns the balance.
 */
export async function ensureMonthlyGrant(userId: string): Promise<number> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("ensure_monthly_grant", {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(`roses.ensureMonthlyGrant: ${error.message}`);
  }
  return data as number;
}

/**
 * Spend-gated generation: monthly grant → spend roses → run `fn`.
 *
 * IMPORTANT: if `fn` throws after the spend, the spend STANDS — roses are not
 * refunded automatically. Generation failures are the caller's problem (the
 * caller may issue a compensating grant via `grantRoses` if it chooses).
 *
 * Returns the generation result plus the post-spend balance.
 */
export async function withRoses<T>(
  userId: string,
  cost: number,
  reason: string,
  fn: () => Promise<T>,
): Promise<{ result: T; balance: number }> {
  await ensureMonthlyGrant(userId);
  const balance = await spendRoses(userId, cost, reason);
  const result = await fn();
  return { result, balance };
}
