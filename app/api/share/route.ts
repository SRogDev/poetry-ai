// POST /api/share — publish a dedication as a public share link (/s/<id>).
// The link id is unguessable (16 random hex chars); the public page renders
// the experience. The interactive link IS the gift.
import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { dedicationId?: unknown };
  try {
    body = (await req.json()) as { dedicationId?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const dedicationId =
    typeof body.dedicationId === "string" ? body.dedicationId : null;
  if (!dedicationId) {
    return NextResponse.json({ error: "dedication_required" }, { status: 400 });
  }

  // Must own the dedication.
  const { data: dedication, error: dErr } = await supabase
    .from("dedications")
    .select("id")
    .eq("id", dedicationId)
    .eq("user_id", user.id)
    .single();
  if (dErr || !dedication) {
    return NextResponse.json({ error: "dedication_not_found" }, { status: 404 });
  }

  // Reuse an existing link for the same dedication.
  const { data: existing } = await supabase
    .from("share_links")
    .select("id")
    .eq("dedication_id", dedicationId)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ id: existing.id, url: `/s/${existing.id}` });
  }

  const id = randomBytes(8).toString("hex");
  const { error } = await supabase.from("share_links").insert({
    id,
    dedication_id: dedicationId,
    created_by: user.id,
  });
  if (error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  return NextResponse.json({ id, url: `/s/${id}` }, { status: 201 });
}
