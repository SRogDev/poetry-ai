// Public share experience (client). Animated line-by-line reveal of the
// dedication, with copy / download / share actions. Mobile-first.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Copy, Download, Heart, Share2, Sparkles } from "lucide-react";
import type { ShareData } from "./page";

const BG =
  "bg-[radial-gradient(120%_100%_at_50%_0%,#3b0f24_0%,#1a0b14_55%,#0d060c_100%)]";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function ShareExperience({
  share,
  shareUrl,
}: {
  share: ShareData;
  shareUrl: string;
}) {
  const lines = useMemo(
    () => (share.lines.length > 0 ? share.lines : share.text.split(/\n+/).filter(Boolean)),
    [share],
  );
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(reduced ? lines.length : 0);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (reduced) {
      setVisible(lines.length);
      return;
    }
    setVisible(0);
    timer.current = setInterval(() => {
      setVisible((v) => {
        if (v >= lines.length && timer.current) clearInterval(timer.current);
        return Math.min(v + 1, lines.length);
      });
    }, 2600);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [lines, reduced]);

  const advance = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    setVisible((v) => Math.min(v + 1, lines.length));
  }, [lines.length]);

  const copyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        `${share.text}\n\n— Hecho con Poetry AI`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [share.text]);

  const downloadImage = useCallback(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const grad = ctx.createLinearGradient(0, 0, 0, 1350);
    grad.addColorStop(0, "#3b0f24");
    grad.addColorStop(0.6, "#1a0b14");
    grad.addColorStop(1, "#0d060c");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = "#f9a8d4";
    ctx.font = "600 44px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Para ${share.recipientName}`, 540, 220);
    ctx.fillStyle = "#ffffff";
    const show = lines.slice(0, 14);
    let y = 340;
    for (const line of show) {
      let fontSize = 52;
      ctx.font = `500 ${fontSize}px Georgia, serif`;
      while (ctx.measureText(line).width > 920 && fontSize > 30) {
        fontSize -= 4;
        ctx.font = `500 ${fontSize}px Georgia, serif`;
      }
      // simple wrap
      const words = line.split(" ");
      let cur = "";
      for (const w of words) {
        const trial = cur ? `${cur} ${w}` : w;
        if (ctx.measureText(trial).width > 920 && cur) {
          ctx.fillText(cur, 540, y);
          y += fontSize * 1.5;
          cur = w;
        } else {
          cur = trial;
        }
      }
      if (cur) {
        ctx.fillText(cur, 540, y);
        y += fontSize * 1.5;
      }
      y += 18;
    }
    ctx.fillStyle = "#f9a8d4";
    ctx.font = "600 36px system-ui, sans-serif";
    ctx.fillText("Hecho con Poetry AI", 540, 1260);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "dedicatoria.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, "image/png");
  }, [lines, share.recipientName]);

  const nativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Para ${share.recipientName}`,
          text: `${share.text.slice(0, 200)}…`,
          url: shareUrl,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copyText();
    }
  }, [share, shareUrl, copyText]);

  const isLetter = share.format === "letter";
  const isQuote = share.format === "quote";

  return (
    <main
      className={`flex min-h-screen flex-col items-center px-6 py-10 text-white ${BG}`}
      onClick={advance}
    >
      <p className="flex items-center gap-2 text-sm tracking-widest text-pink-200/80 uppercase">
        <Heart className="h-4 w-4 fill-pink-400 text-pink-400" aria-hidden />
        Para {share.recipientName}
      </p>

      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center py-10">
        {isQuote ? (
          <blockquote className="text-center font-serif text-3xl leading-snug text-balance">
            “{share.text}”
          </blockquote>
        ) : isLetter ? (
          <article className="w-full rounded-2xl bg-[#fff8f0] p-8 text-stone-800 shadow-2xl">
            <p className="mb-4 font-serif text-lg text-pink-700">
              Querida/o {share.recipientName},
            </p>
            {share.text.split(/\n+/).map((p, i) => (
              <p key={i} className="mb-4 font-serif leading-relaxed">
                {p}
              </p>
            ))}
          </article>
        ) : (
          <div className="space-y-5 text-center">
            {lines.slice(0, visible).map((line, i) => (
              <p
                key={i}
                className="font-serif text-2xl leading-relaxed text-balance animate-[fadeIn_1s_ease]"
              >
                {line}
              </p>
            ))}
            {visible < lines.length && (
              <div className="flex justify-center gap-1.5 pt-4" aria-hidden>
                {lines.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i < visible ? "w-6 bg-pink-400" : "w-1.5 bg-white/20"}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-white/50">Toca para continuar</p>

      <div className="mt-6 grid w-full max-w-md grid-cols-3 gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            copyText();
          }}
          className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl bg-white/10 text-xs font-medium backdrop-blur active:bg-white/20"
        >
          <Copy className="h-5 w-5" aria-hidden />
          {copied ? "¡Copiado!" : "Copiar"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadImage();
          }}
          className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl bg-white/10 text-xs font-medium backdrop-blur active:bg-white/20"
        >
          <Download className="h-5 w-5" aria-hidden />
          Imagen
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            nativeShare();
          }}
          className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-red-600 to-pink-500 text-xs font-semibold text-white shadow-lg shadow-pink-500/30 active:scale-[0.98]"
        >
          <Share2 className="h-5 w-5" aria-hidden />
          Compartir
        </button>
      </div>

      <p className="mt-8 text-xs text-white/40">Hecho con Poetry AI</p>
      <Link
        href="/"
        onClick={(e) => e.stopPropagation()}
        className="mt-3 flex min-h-[44px] items-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-pink-500 px-6 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 active:scale-[0.98]"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        Crea la tuya gratis
      </Link>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }`}</style>
    </main>
  );
}
