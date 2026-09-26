"use client";

// Web Share API (with file when canShare) with graceful fallbacks:
// always Download (when file), Copiar link (when shareUrl), Copiar caption.

import { useState } from "react";
import type { JSX } from "react";
import { Check, Copy, Download, Link2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canNativeShare } from "./canShare";

export function ShareButtons(props: {
  file?: Blob | null;
  fileName: string;
  shareUrl?: string;
  caption: string;
}): JSX.Element {
  const { file, fileName, shareUrl, caption } = props;
  const [copied, setCopied] = useState<"link" | "caption" | null>(null);
  const [sharing, setSharing] = useState(false);

  // canShare({files}) needs real File objects — wrap plain Blobs.
  const fileObj =
    file != null
      ? file instanceof File
        ? file
        : new File([file], fileName, { type: file.type || undefined })
      : null;
  const native = canNativeShare(fileObj);

  const download = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const copyText = async (text: string, which: "link" | "caption") => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for browsers without async clipboard.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        // noop — user can copy manually
      }
      ta.remove();
    }
    setCopied(which);
    window.setTimeout(() => setCopied(null), 2000);
  };

  const nativeShare = async () => {
    if (!fileObj || typeof navigator.share !== "function") return;
    setSharing(true);
    try {
      await navigator.share({ files: [fileObj], title: fileName, text: caption });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // User cancelled the share sheet — stay silent.
      } else {
        // Native share failed (e.g. file too large) — fall back to download.
        download();
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-2">
      {native && fileObj && (
        <Button
          onClick={nativeShare}
          disabled={sharing}
          className="min-h-[44px] w-full bg-gradient-to-r from-red-600 to-pink-500 font-semibold text-white shadow-lg shadow-pink-500/25 transition-all duration-200 hover:opacity-95 active:scale-[0.98]"
        >
          <Share2 aria-hidden />
          {sharing ? "Compartiendo…" : "Compartir"}
        </Button>
      )}
      <div className="flex w-full flex-wrap gap-2">
        {file && (
          <Button
            variant="outline"
            onClick={download}
            className="min-h-[44px] flex-1"
          >
            <Download aria-hidden />
            Descargar
          </Button>
        )}
        {shareUrl && (
          <Button
            variant="outline"
            onClick={() => copyText(shareUrl, "link")}
            className="min-h-[44px] flex-1"
          >
            {copied === "link" ? <Check aria-hidden /> : <Link2 aria-hidden />}
            {copied === "link" ? "¡Copiado!" : "Copiar link"}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => copyText(caption, "caption")}
          className="min-h-[44px] flex-1"
        >
          {copied === "caption" ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied === "caption" ? "¡Copiado!" : "Copiar caption"}
        </Button>
      </div>
    </div>
  );
}
