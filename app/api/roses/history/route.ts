import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /api/roses/history (auth) → { entries: [{ delta, reason, created_at }] }, newest first, max 50. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("roses_ledger")
    .select("delta, reason, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { error: "history_failed", message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ entries: data ?? [] });
}
