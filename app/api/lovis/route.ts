import { ROSE_COSTS, InsufficientRosesError } from "@/lib/roses/balance";
import { withRoses } from "@/lib/roses/gate";
import { NextRequest } from "next/server";
import { sanitizeLoviCode, LoviValidationError } from "@/lib/lovis/sanitize";
import { validateSlots } from "@/lib/lovis/validate";
import { authed, json, safeSearch } from "@/lib/lovis/server";

/**
 * GET /api/lovis — public gallery.
 * ?q= searches name/description. Ordered by uses_count desc.
 * Includes `liked` per item when the request is authenticated.
 */
export async function GET(req: NextRequest) {
  const q = safeSearch(new URL(req.url).searchParams.get("q") ?? "");
  const { supabase, user } = await authed();

  let query = supabase
    .from("lovis")
    .select(
      "id, creator_id, name, description, thumbnail_url, uses_count, likes_count, slots, created_at",
    )
    .order("uses_count", { ascending: false })
    .limit(60);
  if (q) {
    query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[lovis] gallery query failed:", error.message);
    return json({ error: "No se pudo cargar la galería." }, 500);
  }

  let likedIds = new Set<string>();
  if (user && data.length > 0) {
    const { data: likes } = await supabase
      .from("lovi_likes")
      .select("lovi_id")
      .eq("user_id", user.id)
      .in(
        "lovi_id",
        data.map((l) => l.id),
      );
    likedIds = new Set((likes ?? []).map((l) => l.lovi_id));
  }

  return json({
    lovis: data.map((l) => ({
      ...l,
      liked: user ? likedIds.has(l.id) : undefined,
    })),
  });
}

/**
 * POST /api/lovis — publish a Lovi (auth). Costs ROSE_COSTS.lovi_create.
 * Body: {name, description?, code, slots} → 201 {id}
 */
export async function POST(req: NextRequest) {
  const { supabase, user } = await authed();
  if (!user) {
    return json({ error: "Inicia sesión para publicar tu Lovi." }, 401);
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description =
    typeof body?.description === "string" ? body.description.trim() : "";

  if (!name) return json({ error: "Ponle un nombre a tu Lovi." }, 400);
  if (name.length > 80)
    return json({ error: "El nombre es muy largo (máximo 80 caracteres)." }, 400);
  if (description.length > 280)
    return json(
      { error: "La descripción es muy larga (máximo 280 caracteres)." },
      400,
    );

  let code: string;
  try {
    code = sanitizeLoviCode(typeof body?.code === "string" ? body.code : "");
  } catch (e) {
    if (e instanceof LoviValidationError) return json({ error: e.message }, 400);
    throw e;
  }

  let slots;
  try {
    slots = validateSlots(body?.slots);
  } catch (e) {
    if (e instanceof LoviValidationError) return json({ error: e.message }, 400);
    throw e;
  }

  try {
    const { result: id } = await withRoses(
      user.id,
      ROSE_COSTS.lovi_create,
      "lovi_create",
      async () => {
        const { data, error } = await supabase
          .from("lovis")
          .insert({
            creator_id: user.id,
            name,
            description: description || null,
            code,
            slots,
          })
          .select("id")
          .single();
        if (error || !data) {
          console.error("[lovis] publish insert failed:", error?.message);
          throw new Error("No se pudo publicar el Lovi.");
        }
        return data.id as string;
      },
    );
    return json({ id }, 201);
  } catch (e) {
    if (e instanceof InsufficientRosesError) {
      return json(
        { error: "insufficient_roses", rosesBalance: e.balance },
        402,
      );
    }
    throw e;
  }
}
