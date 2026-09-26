import { authed, json, serviceRole } from "@/lib/lovis/server";

/**
 * POST /api/lovis/[id]/like — toggle like (auth).
 * The unique PK on (lovi_id, user_id) makes the toggle race-safe;
 * the cached counter is re-synced best-effort via service role
 * (RLS only lets the creator update the lovis row).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await authed();
  if (!user) {
    return json({ error: "Inicia sesión para dar me gusta." }, 401);
  }

  const { data: lovi } = await supabase
    .from("lovis")
    .select("id")
    .eq("id", id)
    .single();
  if (!lovi) return json({ error: "Este Lovi no existe." }, 404);

  let liked: boolean;
  const { error: insertError } = await supabase
    .from("lovi_likes")
    .insert({ lovi_id: id, user_id: user.id });

  if (!insertError) {
    liked = true;
  } else if (insertError.code === "23505") {
    // Already liked → unlike.
    const { error: deleteError } = await supabase
      .from("lovi_likes")
      .delete()
      .eq("lovi_id", id)
      .eq("user_id", user.id);
    if (deleteError) {
      console.error("[lovis] unlike failed:", deleteError.message);
      return json({ error: "No se pudo quitar el me gusta." }, 500);
    }
    liked = false;
  } else {
    console.error("[lovis] like failed:", insertError.message);
    return json({ error: "No se pudo dar me gusta." }, 500);
  }

  // Best-effort counter resync (converges on subsequent toggles).
  try {
    const svc = serviceRole();
    const { count } = await svc
      .from("lovi_likes")
      .select("lovi_id", { count: "exact", head: true })
      .eq("lovi_id", id);
    await svc
      .from("lovis")
      .update({ likes_count: count ?? 0 })
      .eq("id", id);
    return json({ liked, likes_count: count ?? 0 });
  } catch (e) {
    console.error("[lovis] likes counter resync failed:", (e as Error).message);
    const { data: row } = await supabase
      .from("lovis")
      .select("likes_count")
      .eq("id", id)
      .single();
    return json({ liked, likes_count: row?.likes_count ?? 0 });
  }
}
