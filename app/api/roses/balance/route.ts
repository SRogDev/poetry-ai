import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBalance } from "@/lib/roses/balance";

/** GET /api/roses/balance (auth) → { balance } */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const balance = await getBalance(user.id);
    return NextResponse.json({ balance });
  } catch (e) {
    return NextResponse.json(
      { error: "balance_failed", message: (e as Error).message },
      { status: 500 },
    );
  }
}
