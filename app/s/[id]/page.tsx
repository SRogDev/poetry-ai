// /s/[id] — public dedication experience. The link IS the gift.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ShareExperience } from "./experience";
import { LoviShareExperience } from "./lovi-experience";
import type { LoviData } from "@/lib/lovis/slots";

// Public share pages are per-dedication and always server-rendered at request
// time (the share id is only known at runtime). Never prerendered.
export const instant = false;

export interface ShareData {
  format: string;
  text: string;
  lines: string[];
  recipientName: string;
  emotionTarget: string | null;
  /** Present when format === "lovi". */
  lovi?: { code: string; data: LoviData; name: string } | null;
}

async function loadShare(id: string): Promise<ShareData | null> {
  try {
    const supabase = createServiceRoleClient();
    const { data: link } = await supabase
      .from("share_links")
      .select("dedication_id")
      .eq("id", id)
      .single();
    if (!link) return null;
    const { data: d } = await supabase
      .from("dedications")
      .select("format, output, emotion_target, recipient_id, lovi_id")
      .eq("id", link.dedication_id)
      .single();
    if (!d) return null;
    let recipientName = "ti";
    if (d.recipient_id) {
      const { data: r } = await supabase
        .from("recipients")
        .select("name")
        .eq("id", d.recipient_id)
        .single();
      if (r?.name) recipientName = r.name;
    }
    const output = (d.output ?? {}) as {
      text?: string;
      lines?: string[];
      data?: LoviData;
    };
    let lovi: ShareData["lovi"] = null;
    if (d.format === "lovi" && d.lovi_id) {
      const { data: l } = await supabase
        .from("lovis")
        .select("name, code")
        .eq("id", d.lovi_id)
        .single();
      if (l?.code) {
        lovi = { code: l.code as string, data: output.data ?? {}, name: (l.name as string) ?? "Lovi" };
      }
    }
    return {
      format: d.format as string,
      text: output.text ?? "",
      lines: output.lines ?? [],
      recipientName,
      emotionTarget: (d.emotion_target as string | null) ?? null,
      lovi,
    };
  } catch {
    return null;
  }
}

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://poetry-ai.app"
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const share = await loadShare(id);
  const url = `${appUrl()}/s/${id}`;
  const title = share
    ? `Para ${share.recipientName}: te dedicaron algo especial · Poetry AI`
    : "Poetry AI — detalles que se sienten";
  const description = share
    ? "Ábrelo. Siéntelo. Alguien creó esto para ti con Poetry AI."
    : "Poetry AI crea dedicatorias emocionales con IA.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [{ url: `${appUrl()}/api/og/${id}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${appUrl()}/api/og/${id}`],
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const share = await loadShare(id);
  if (!share) notFound();
  const shareUrl = `${appUrl()}/s/${id}`;

  if (share.format === "lovi") {
    if (!share.lovi) notFound();
    return <LoviShareExperience share={share} shareUrl={shareUrl} />;
  }

  if (!share.text) notFound();
  return <ShareExperience share={share} shareUrl={shareUrl} />;
}
