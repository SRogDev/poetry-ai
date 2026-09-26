import { randomBytes } from "crypto";
import { NextRequest } from "next/server";
import { ROSE_COSTS, InsufficientRosesError } from "@/lib/roses/balance";
import { withRoses } from "@/lib/roses/gate";
import { authed, json, serviceRole } from "@/lib/lovis/server";

/** Max serialized size of the dedication data the client may send. */
const MAX_DATA_BYTES = 50_000;

/**
 * POST /api/lovis/[id]/use — use a Lovi for a dedication (auth).
 * Costs ROSE_COSTS.lovi_use. Body: {dedicationData?: object, dedicationId?: string}
 *
 * v1 flow: creates the `dedications` row (format 'lovi', lovi_id, output.data),
 * logs the `lovi_uses` row, bumps uses_count, creates the public `share_links`
 * row (16 unguessable hex chars) and returns {ok: true, shareUrl: "/s/<id>"}.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await authed();
  if (!user) {
    return json({ error: "Inicia sesión para usar este Lovi." }, 401);
  }

  const { data: lovi } = await supabase
    .from("lovis")
    .select("id")
    .eq("id", id)
    .single();
  if (!lovi) return json({ error: "Este Lovi no existe." }, 404);

  const body = await req.json().catch(() => ({}));
  const dedicationData =
    body?.dedicationData && typeof body.dedicationData === "object"
      ? (body.dedicationData as Record<string, unknown>)
      : {};
  const dedicationId =
    typeof body?.dedicationId === "string" ? body.dedicationId : null;

  if (Buffer.byteLength(JSON.stringify(dedicationData), "utf8") > MAX_DATA_BYTES) {
    return json({ error: "Los datos de la dedicatoria son demasiado grandes." }, 400);
  }

  try {
    const { result: shareUrl } = await withRoses(
      user.id,
      ROSE_COSTS.lovi_use,
      "lovi_use",
      async () => {
        let dedId = dedicationId;
        if (!dedId) {
          const { data: ded, error } = await supabase
            .from("dedications")
            .insert({
              user_id: user.id,
              format: "lovi",
              lovi_id: id,
              output: { data: dedicationData },
              roses_spent: ROSE_COSTS.lovi_use,
            })
            .select("id")
            .single();
          if (error || !ded) {
            console.error("[lovis] dedication insert failed:", error?.message);
            throw new Error("No se pudo crear la dedicatoria.");
          }
          dedId = ded.id as string;
        } else {
          const { data: own } = await supabase
            .from("dedications")
            .select("id")
            .eq("id", dedId)
            .eq("user_id", user.id)
            .single();
          if (!own) throw new Error("dedication_not_found");
        }

        const { error: useError } = await supabase.from("lovi_uses").insert({
          lovi_id: id,
          user_id: user.id,
          dedication_id: dedId,
        });
        if (useError) {
          console.error("[lovis] lovi_uses insert failed:", useError.message);
          throw new Error("No se pudo registrar el uso.");
        }

        // Public share link: 16 unguessable hex chars → /s/<id>.
        const shareId = randomBytes(8).toString("hex");
        const { error: shareError } = await supabase.from("share_links").insert({
          id: shareId,
          dedication_id: dedId,
        });
        if (shareError) {
          console.error("[lovis] share_links insert failed:", shareError.message);
          throw new Error("No se pudo crear el link para compartir.");
        }
        await supabase
          .from("dedications")
          .update({ share_id: shareId })
          .eq("id", dedId);

        // Best-effort uses counter (RLS restricts lovis updates to creator).
        try {
          const svc = serviceRole();
          const { count } = await svc
            .from("lovi_uses")
            .select("lovi_id", { count: "exact", head: true })
            .eq("lovi_id", id);
          await svc
            .from("lovis")
            .update({ uses_count: count ?? 0 })
            .eq("id", id);
        } catch (e) {
          console.error("[lovis] uses counter resync failed:", (e as Error).message);
        }

        return `/s/${shareId}`;
      },
    );
    return json({ ok: true, shareUrl });
  } catch (e) {
    if (e instanceof InsufficientRosesError) {
      return json(
        { error: "insufficient_roses", rosesBalance: e.balance },
        402,
      );
    }
    if (e instanceof Error && e.message === "dedication_not_found") {
      return json({ error: "Dedicatoria no encontrada." }, 404);
    }
    console.error("[lovis] use failed:", (e as Error).message);
    return json({ error: "No se pudo crear tu dedicatoria." }, 500);
  }
}
