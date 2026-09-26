// Lovi public share experience — the link IS the gift.
// Renders the interactive artifact in a sandboxed iframe, with share actions
// and the free-tier attribution.
"use client";

import Link from "next/link";
import { Gift, Sparkles } from "lucide-react";
import { LoviRenderer } from "@/components/lovis/LoviRenderer";
import { ShareButtons } from "@/components/share/ShareButtons";
import type { ShareData } from "./page";

export function LoviShareExperience({
  share,
  shareUrl,
}: {
  share: ShareData;
  shareUrl: string;
}) {
  const lovi = share.lovi;
  if (!lovi) return null;
  const caption = `Mira este detalle que crearon para ${share.recipientName} 🌹 ${shareUrl}`;

  return (
    <div className="flex min-h-dvh flex-col bg-[#1a0b14] text-white">
      {/* Header */}
      <header className="px-5 pb-2 pt-6 text-center">
        <p className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-pink-300">
          <Gift className="h-4 w-4" aria-hidden />
          Para {share.recipientName}
        </p>
        <h1 className="mt-2 text-2xl font-bold">{lovi.name}</h1>
        {share.emotionTarget && (
          <p className="mt-1 text-sm text-white/60">
            creado para {share.emotionTarget}
          </p>
        )}
      </header>

      {/* Interactive artifact */}
      <main className="flex-1 px-4 py-4">
        <div className="mx-auto h-[62dvh] w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl shadow-pink-950/50">
          <LoviRenderer code={lovi.code} data={lovi.data} title={lovi.name} />
        </div>
      </main>

      {/* Actions */}
      <footer className="px-5 pb-8 pt-2">
        <div className="mx-auto max-w-2xl">
          <ShareButtons
            fileName={`lovi-${share.recipientName}.html`}
            shareUrl={shareUrl}
            caption={caption}
          />
          <p className="mt-4 text-center text-xs text-white/50">
            Hecho con Poetry AI
          </p>
          <Link
            href="/"
            className="mx-auto mt-3 flex min-h-[44px] w-fit items-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-pink-500 px-6 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Crea la tuya gratis
          </Link>
        </div>
      </footer>
    </div>
  );
}
