// Roses pricing — client-safe (no server imports).
// Single source of truth for prices; lib/roses/balance.ts re-exports these.

/**
 * Rose price per generation kind. Margin rule: price ≥ 5-10× max AI cost.
 * BUILD.md mirrors these values.
 */
export const ROSE_COSTS: Record<string, number> = {
  poem: 1,
  letter: 2,
  quote: 2,
  slideshow: 5,
  video: 10,
  song: 15,
  lovi_create: 15,
  lovi_use: 5,
};

/** Free signup grant (mirrors db.sql handle_new_user). */
export const SIGNUP_BONUS_ROSES = 10;

/** Free monthly grant (mirrors db.sql ensure_monthly_grant). */
export const MONTHLY_GRANT_ROSES = 20;
