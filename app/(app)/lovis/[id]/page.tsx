import { notFound } from "next/navigation";
import { LoviUseForm, type UseLovi } from "@/components/lovis/LoviUseForm";
import { createClient } from "@/lib/supabase/server";
import { validateSlots } from "@/lib/lovis/validate";
import type { LoviSlot } from "@/lib/lovis/slots";

// Fully dynamic: per-Lovi content + per-user liked state. Never prerendered.
export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("lovis")
    .select("name, description")
    .eq("id", id)
    .single();
  return {
    title: data ? `${data.name} — Lovi` : "Lovi",
    description: data?.description ?? "Un detalle interactivo de Poetry AI.",
  };
}

export default async function LoviDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lovi } = await supabase
    .from("lovis")
    .select(
      "id, name, description, code, slots, uses_count, likes_count",
    )
    .eq("id", id)
    .single();
  if (!lovi) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  // Re-validate stored slots defensively (gallery content is community-made).
  let slots: LoviSlot[] = [];
  try {
    slots = validateSlots(lovi.slots);
  } catch {
    slots = [];
  }

  const useLovi: UseLovi = {
    id: lovi.id,
    name: lovi.name,
    description: lovi.description,
    code: lovi.code,
    slots,
    uses_count: lovi.uses_count,
    likes_count: lovi.likes_count,
    liked,
  };

  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-6">
      <LoviUseForm lovi={useLovi} />
    </main>
  );
}
