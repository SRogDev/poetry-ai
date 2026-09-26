// Service-role Supabase client — SERVER ONLY.
// Bypasses RLS. Never import from a client component or return its data
// unchecked. Used for: roses ledger RPCs, share pages, OG images.
import { createClient } from "@supabase/supabase-js";

export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — server-only operations are unavailable.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
