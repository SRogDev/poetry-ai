import { authed, json, type LoviRecord } from "@/lib/lovis/server";

/** GET /api/lovis/[id] — one Lovi (public). Includes `liked` when authed. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await authed();

  const { data, error } = await supabase
    .from("lovis")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) {
    return json({ error: "Este Lovi no existe." }, 404);
  }
  const lovi = data as LoviRecord;

  let liked = false;
  if (user) {
    const { data: like } = await supabase
      .from("lovi_likes")
      .select("lovi_id")
      .eq("lovi_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    liked = !!like;
  }

  return json({ lovi: { ...lovi, liked } });
}
