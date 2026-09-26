// Server-only helpers shared by the /api/lovis routes.
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";
import type { LoviSlot } from "./slots";

/** The signed-in user (or null) plus a user-scoped Supabase client. */
export async function authed() {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Service-role Supabase client (bypasses RLS). Use ONLY for aggregate
 * counters (uses_count/likes_count) that RLS restricts to creators —
 * never for user-owned reads/writes.
 */
export function serviceRole() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role is not configured");
  }
  return createServiceClient(url, key);
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export interface LoviRecord {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  code: string;
  slots: LoviSlot[];
  thumbnail_url: string | null;
  uses_count: number;
  likes_count: number;
  created_at: string;
}

/** Escape user input for a PostgREST .or() ilike filter. */
export function safeSearch(q: string): string {
  return q
    .slice(0, 60)
    .replace(/[%_(),"]/g, "")
    .trim();
}
