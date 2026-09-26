"use client";

// Beautiful letter card: paper-textured DOM render with
// "Descargar PNG" (manual 1080x1350 canvas render) and "Copiar texto".

import { useState } from "react";
import type { JSX } from "react";
import { Check, Copy, Download, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { renderLetterPNG } from "./letterPng";

export function LetterCard(props: {
  letter: string;
  recipientName: string;
  fromName?: string;
  onSharePNG?: (blob: Blob) => void;
}): JSX.Element {
  const { letter, recipientName, fromName, onSharePNG } = props;
  const [rendering, setRendering] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signature = fromName ?? "Con amor";

  const plainText = `Para ${recipientName}:\n\n${letter}\n\n— ${signature}`;

  const handleDownloadPNG = async () => {
    setError(null);
    setRendering(true);
    try {
      const blob = await renderLetterPNG({ letter, recipientName, fromName });
      onSharePNG?.(blob);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "carta.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo generar la imagen.",
      );
    } finally {
      setRendering(false);
    }
  };

  const handleCopy = async () => {
    setError(null);
    try {
      await navigator.clipboard.writeText(plainText);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = plainText;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        setError("No se pudo copiar. Selecciónalo manualmente.");
        ta.remove();
        return;
      }
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full">
      <article
        className="relative overflow-hidden rounded-2xl border border-[#E4E4E7] p-6 shadow-md sm:p-8"
        style={{
          background:
            "linear-gradient(180deg, #FFFBF7 0%, #FDF3E7 60%, #FBEFE3 100%)",
        }}
        aria-label={`Carta para ${recipientName}`}
      >
        {/* paper texture: faint horizontal rules */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "repeating-linear-gradient(180deg, transparent 0 31px, rgba(190,150,120,0.12) 31px 32px)",
          }}
        />
        <div className="relative">
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-block h-2.5 w-12 rounded-full bg-[#EC4899]" />
            <Mail className="h-4 w-4 text-[#9D174D]" aria-hidden />
          </div>
          <p className="font-['Space_Grotesk'] text-sm font-semibold tracking-wide text-[#9D174D] uppercase">
            Para
          </p>
          <h3 className="mt-1 bg-gradient-to-r from-red-600 to-pink-500 bg-clip-text font-['Space_Grotesk'] text-2xl font-bold text-transparent">
            {recipientName}
          </h3>
          <hr className="my-4 border-[#F9A8D4]" />
          <p className="font-serif text-[17px] leading-relaxed whitespace-pre-line text-[#292524]">
            {letter}
          </p>
          <p className="mt-6 text-right font-serif text-lg font-semibold text-[#9D174D] italic">
            — {signature}
          </p>
        </div>
      </article>

      {error && (
        <p role="alert" className="mt-3 text-sm text-[#DC2626]">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={handleDownloadPNG}
          disabled={rendering}
          className="min-h-[44px] flex-1 bg-gradient-to-r from-red-600 to-pink-500 font-semibold text-white shadow-lg shadow-pink-500/25 transition-all duration-200 hover:opacity-95 active:scale-[0.98]"
        >
          {rendering ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Download aria-hidden />
          )}
          {rendering ? "Generando…" : "Descargar PNG"}
        </Button>
        <Button
          variant="outline"
          onClick={handleCopy}
          className="min-h-[44px] flex-1"
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? "¡Copiado!" : "Copiar texto"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-[#475569]">
        El texto copiado está listo para pegar en WhatsApp.
      </p>
    </div>
  );
}
