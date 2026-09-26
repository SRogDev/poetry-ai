// /api/recipients — full CRUD over the user's recipient profiles.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SELECT = "id, name, nickname, relationship, notes, photo_url, created_at";

function cleanString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t.slice(0, max) : null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("recipients")
    .select(SELECT)
    .eq("user_id", user.id)
    .order("name");
  if (error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  return NextResponse.json({ recipients: data });
}

export async function POST(req: NextRequest) {
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

  const name = cleanString(body.name, 120);
  if (!name) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  // Nickname: strip leading @, normalize for @mention matching.
  const nickname =
    cleanString(body.nickname, 60)?.replace(/^@+/, "").toLowerCase() ?? null;

  const { data, error } = await supabase
    .from("recipients")
    .insert({
      user_id: user.id,
      name,
      nickname,
      relationship: cleanString(body.relationship, 60),
      notes: cleanString(body.notes, 2000),
      photo_url: cleanString(body.photo_url, 500),
    })
    .select(SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  return NextResponse.json({ recipient: data }, { status: 201 });
}
