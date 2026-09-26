"use client";

// Quote video composer: kinetic typography — words of `text` scale/fade
// in sequence over an animated gradient background. 9:16, ~6s,
// shared export/watermark pipeline.

import { useCallback, useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { AlertTriangle, Film, Loader2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareButtons } from "@/components/share/ShareButtons";
import {
  ExportError,
  drawWatermark,
  easeOutBack,
  mimeToExtension,
  startCanvasExport,
  useCanvasPreview,
} from "./exportVideo";

const W = 1080;
const H = 1920;
const DURATION_SEC = 6;
const POP_SEC = 0.35;

interface WordLayout {
  word: string;
  index: number;
  x: number; // left edge
  y: number; // baseline center
  width: number;
}

interface ExportedFile {
  blob: Blob;
  mimeType: string;
  fileName: string;
}

/** Lay out words into centered lines; each word keeps its global index. */
function layoutWords(
  ctx: CanvasRenderingContext2D,
  words: string[],
  fontSize: number,
  maxWidth: number,
): WordLayout[] {
  ctx.font = `700 ${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  const lines: string[][] = [];
  let current: string[] = [];
  let currentW = 0;
  const spaceW = ctx.measureText(" ").width;
  words.forEach((word) => {
    const w = ctx.measureText(word).width;
    if (current.length > 0 && currentW + spaceW + w > maxWidth) {
      lines.push(current);
      current = [];
      currentW = 0;
    }
    if (current.length > 0) currentW += spaceW;
    current.push(word);
    currentW += w;
  });
  if (current.length > 0) lines.push(current);

  const out: WordLayout[] = [];
  const lineH = fontSize * 1.45;
  const blockH = lines.length * lineH;
  let y = H / 2 - blockH / 2 + lineH / 2;
  let index = 0;
  for (const line of lines) {
    const lineW = line.reduce(
      (acc, w, li) =>
        acc + ctx.measureText(w).width + (li > 0 ? spaceW : 0),
      0,
    );
    let x = W / 2 - lineW / 2;
    for (const word of line) {
      const w = ctx.measureText(word).width;
      out.push({ word, index, x, y, width: w });
      x += w + spaceW;
      index += 1;
    }
    y += lineH;
  }
  return out;
}

export function QuoteVideoComposer(props: {
  text: string;
  watermark: boolean;
  onExported?: (blob: Blob, mimeType: string) => void;
}): JSX.Element {
  const { text, watermark, onExported } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exported, setExported] = useState<ExportedFile | null>(null);

  const words = text.split(/\s+/).filter(Boolean);
  const perWord = DURATION_SEC / Math.max(1, words.length);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, t: number) => {
      // Animated gradient background (pink -> violet, slowly shifting).
      const hue = 318 + Math.sin(t * 0.9) * 18;
      const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
      g.addColorStop(0, `hsl(${hue}, 72%, 14%)`);
      g.addColorStop(0.55, `hsl(${(hue + 24) % 360}, 66%, 24%)`);
      g.addColorStop(1, `hsl(${(hue + 44) % 360}, 60%, 10%)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // Two soft drifting light blobs for depth.
      const blob1x = W * (0.5 + 0.28 * Math.sin(t * 0.5));
      const blob1y = H * (0.32 + 0.08 * Math.cos(t * 0.4));
      const rg1 = ctx.createRadialGradient(blob1x, blob1y, 0, blob1x, blob1y, 420);
      rg1.addColorStop(0, "rgba(236,72,153,0.35)");
      rg1.addColorStop(1, "rgba(236,72,153,0)");
      ctx.fillStyle = rg1;
      ctx.fillRect(0, 0, W, H);
      const blob2x = W * (0.5 + 0.3 * Math.cos(t * 0.35 + 2));
      const blob2y = H * (0.72 + 0.08 * Math.sin(t * 0.45 + 1));
      const rg2 = ctx.createRadialGradient(blob2x, blob2y, 0, blob2x, blob2y, 460);
      rg2.addColorStop(0, "rgba(168,85,247,0.28)");
      rg2.addColorStop(1, "rgba(168,85,247,0)");
      ctx.fillStyle = rg2;
      ctx.fillRect(0, 0, W, H);

      if (words.length === 0) {
        if (watermark) drawWatermark(ctx);
        return;
      }

      // Kinetic typography: words pop in sequence, current word in pink.
      const laid = layoutWords(ctx, words, 76, W - 160);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      for (const wl of laid) {
        const wordT = wl.index * perWord;
        const local = (t - wordT) / POP_SEC;
        if (local <= 0) continue;
        const a = Math.min(1, local);
        const scale = Math.max(0.01, easeOutBack(local));
        const isCurrent = t >= wordT && t < wordT + perWord;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(wl.x + wl.width / 2, wl.y);
        ctx.scale(scale, scale);
        ctx.shadowColor = "rgba(0,0,0,0.55)";
        ctx.shadowBlur = 14;
        ctx.fillStyle = isCurrent ? "#EC4899" : "#FFFFFF";
        ctx.font = `700 76px "Space Grotesk", system-ui, sans-serif`;
        ctx.fillText(wl.word, -wl.width / 2, 0);
        ctx.restore();
      }

      if (watermark) drawWatermark(ctx);
    },
    [words, perWord, watermark],
  );

  const preview = useCanvasPreview({
    canvasRef,
    durationSec: DURATION_SEC,
    draw,
    active: true,
  });

  useEffect(() => {
    preview.renderFrame(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = async () => {
    const canvas = canvasRef.current;
    if (exporting || !canvas) return;
    preview.stop();
    setExportError(null);
    setExported(null);
    setExporting(true);
    setExportProgress(0);
    let lastBucket = -1;
    try {
      const { blob, mimeType } = await startCanvasExport({
        canvas,
        durationSec: DURATION_SEC,
        draw,
        onProgress: (t, total) => {
          const bucket = Math.floor((t / total) * 50);
          if (bucket !== lastBucket) {
            lastBucket = bucket;
            setExportProgress(t / total);
          }
        },
      });
      const fileName = `poetry-frase.${mimeToExtension(mimeType)}`;
      setExported({ blob, mimeType, fileName });
      onExported?.(blob, mimeType);
    } catch (e) {
      setExportError(
        e instanceof ExportError
          ? e.message
          : "No se pudo exportar el video. Inténtalo de nuevo.",
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="w-full max-w-[300px]">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="h-auto w-full rounded-2xl border border-[#E4E4E7] shadow-lg"
          aria-label="Vista previa del video de la frase"
        />
      </div>

      <div className="flex w-full max-w-[300px] flex-col gap-2">
        <div className="flex gap-2">
          <Button
            onClick={preview.toggle}
            disabled={exporting}
            className="min-h-[44px] flex-1 bg-gradient-to-r from-red-600 to-pink-500 text-white shadow-lg shadow-pink-500/25 transition-all duration-200 hover:opacity-95 active:scale-[0.98]"
            aria-label={preview.playing ? "Pausar vista previa" : "Reproducir vista previa"}
          >
            {preview.playing ? <Pause aria-hidden /> : <Play aria-hidden />}
            Vista previa
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="min-h-[44px] flex-1 bg-gradient-to-r from-red-600 to-pink-500 font-semibold text-white shadow-lg shadow-pink-500/25 transition-all duration-200 hover:opacity-95 active:scale-[0.98]"
          >
            {exporting ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <Film aria-hidden />
            )}
            {exporting ? `${Math.round(exportProgress * 100)}%` : "Exportar video"}
          </Button>
        </div>
        {exporting && (
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-[#E8ECF0]"
            role="progressbar"
            aria-valuenow={Math.round(exportProgress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso de exportación"
          >
            <div
              className="h-full bg-[#EC4899] transition-[width] duration-200"
              style={{ width: `${Math.round(exportProgress * 100)}%` }}
            />
          </div>
        )}
        {exportError && (
          <p role="alert" className="flex items-start gap-2 text-sm text-[#DC2626]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {exportError}
          </p>
        )}
      </div>

      {exported && (
        <div className="w-full max-w-[300px]">
          <ShareButtons
            file={exported.blob}
            fileName={exported.fileName}
            caption={`${text} — hecho con Poetry AI`}
          />
        </div>
      )}
    </div>
  );
}
