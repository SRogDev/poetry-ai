// /api/recipients/[id] — update / delete one recipient.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SELECT = "id, name, nickname, relationship, notes, photo_url, created_at";

function cleanString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t.slice(0, max) : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const patch: Record<string, string | null> = {};
  const name = cleanString(body.name, 120);
  if (name) patch.name = name;
  if ("nickname" in body)
    patch.nickname =
      cleanString(body.nickname, 60)?.replace(/^@+/, "").toLowerCase() ?? null;
  if ("relationship" in body)
    patch.relationship = cleanString(body.relationship, 60);
  if ("notes" in body) patch.notes = cleanString(body.notes, 2000);
  if ("photo_url" in body) patch.photo_url = cleanString(body.photo_url, 500);

  const { data, error } = await supabase
    .from("recipients")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(SELECT)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "recipient_not_found" }, { status: 404 });
  }
  return NextResponse.json({ recipient: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("recipients")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
