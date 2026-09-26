// Roses 🌹 — the single unit of value in Poetry AI.
//
// Reads go through RLS (profiles.roses_balance). Mutations MUST use the
// service-role Supabase client + the atomic add_roses() RPC from db.sql,
// which appends to roses_ledger and updates the cached balance together.

/** Rose price per generation kind. Margin rule: price ≥ 5-10× max AI cost. */
export const ROSE_COSTS: Record<string, number> = {
  poem: 1,
  letter: 2,
  quote: 2,
  slideshow: 5,
  video: 10,
  song: 15,
  lovi_create: 20,
  lovi_use: 5,
};

/** Free signup grant (mirrors db.sql handle_new_user). */
export const SIGNUP_BONUS_ROSES = 10;

/** Read the cached balance for a user (RLS: own row). */
export async function getBalance(userId: string): Promise<number> {
  // TODO Phase 1: supabase.from("profiles").select("roses_balance").single()
  throw new Error(`roses.getBalance(${userId}): not implemented (Phase 1)`);
}

/**
 * Spend roses atomically. Throws when the balance is insufficient.
 * Must call the add_roses() RPC with a NEGATIVE delta via service role.
 */
export async function spendRoses(
  userId: string,
  amount: number,
  reason: string,
  ref?: string,
): Promise<number> {
  // TODO Phase 1: check-then-spend inside a transaction (or extend add_roses
  // with an insufficient-funds guard) to avoid race conditions.
  throw new Error(
    `roses.spendRoses(${userId}, ${amount}, ${reason}, ${ref ?? "noref"}): not implemented (Phase 1)`,
  );
}

/** Grant roses (subscription cycle, top-up, creator rewards). Positive delta. */
export async function grantRoses(
  userId: string,
  amount: number,
  reason: string,
  ref?: string,
): Promise<number> {
  // TODO Phase 1: add_roses() RPC with a positive delta via service role.
  throw new Error(
    `roses.grantRoses(${userId}, ${amount}, ${reason}, ${ref ?? "noref"}): not implemented (Phase 1)`,
  );
}
