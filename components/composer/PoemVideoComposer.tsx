"use client";

// Poem video composer: 1080x1920 canvas, Ken Burns over images with
// crossfades, line-by-line timed text, synced narration/music,
// watermark burn-in, and MediaRecorder export.

import { useCallback, useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { AlertTriangle, Film, Loader2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareButtons } from "@/components/share/ShareButtons";
import { wrapText } from "@/components/cards/letterText";
import {
  ExportError,
  drawCoverImage,
  drawWatermark,
  getAudioDuration,
  loadImage,
  mimeToExtension,
  sceneAt,
  startCanvasExport,
  useCanvasPreview,
} from "./exportVideo";

const W = 1080;
const H = 1920;
const CROSSFADE_SEC = 0.6;
const TEXT_FADE_SEC = 0.4;
const MUSIC_VOLUME = 0.15;

interface ExportedFile {
  blob: Blob;
  mimeType: string;
  fileName: string;
}

export function PoemVideoComposer(props: {
  lines: string[];
  images: string[];
  audioUrl?: string;
  musicUrl?: string;
  recipientName: string;
  watermark: boolean;
  onExported?: (blob: Blob, mimeType: string) => void;
}): JSX.Element {
  const {
    lines,
    images,
    audioUrl,
    musicUrl,
    recipientName,
    watermark,
    onExported,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const narrationRef = useRef<HTMLAudioElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);

  const [loadedImgs, setLoadedImgs] = useState<HTMLImageElement[]>([]);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exported, setExported] = useState<ExportedFile | null>(null);

  const ready = loadedImgs.length > 0 && durationSec != null && durationSec > 0;

  // Load background images.
  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setLoadedImgs([]);
    if (images.length === 0) {
      setLoadError("No hay imágenes para el video.");
      return;
    }
    Promise.all(images.map(loadImage))
      .then((imgs) => {
        if (!cancelled) setLoadedImgs(imgs);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setLoadError(
            e instanceof Error ? e.message : "No se pudieron cargar las imágenes.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [images]);

  // Resolve total duration: narration length, else 4s per line.
  useEffect(() => {
    let cancelled = false;
    setDurationSec(null);
    const fallback = Math.max(1, lines.length) * 4;
    if (!audioUrl) {
      setDurationSec(fallback);
      return;
    }
    getAudioDuration(audioUrl).then((d) => {
      if (cancelled) return;
      setDurationSec(Number.isFinite(d) && d > 0 ? d : fallback);
    });
    return () => {
      cancelled = true;
    };
  }, [audioUrl, lines.length]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, t: number) => {
      ctx.fillStyle = "#09090B";
      ctx.fillRect(0, 0, W, H);
      if (loadedImgs.length === 0 || durationSec == null) return;

      const sceneCount = Math.max(1, lines.length);
      const sceneDur = durationSec / sceneCount;
      const i = sceneAt(t, sceneCount, sceneDur);
      const p = Math.min(
        1,
        Math.max(0, (t - i * sceneDur) / Math.max(sceneDur, 0.001)),
      );

      // Current image with Ken Burns.
      drawCoverImage(ctx, loadedImgs[i % loadedImgs.length], p, (i % 8) / 8);

      // Crossfade into the next image near the scene boundary.
      if (i < sceneCount - 1 && sceneDur > CROSSFADE_SEC) {
        const fadeStart = 1 - CROSSFADE_SEC / sceneDur;
        if (p > fadeStart) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, (p - fadeStart) / (1 - fadeStart));
          drawCoverImage(
            ctx,
            loadedImgs[(i + 1) % loadedImgs.length],
            0,
            ((i + 1) % 8) / 8,
          );
          ctx.restore();
        }
      }

      // Bottom gradient for text readability.
      const shade = ctx.createLinearGradient(0, H * 0.4, 0, H);
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, W, H);

      // Header: dedication to the recipient.
      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = "#EC4899";
      const accentW = 72;
      ctx.fillRect(W / 2 - accentW / 2, 108, accentW, 8);
      ctx.font = `600 38px "Space Grotesk", system-ui, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowBlur = 10;
      ctx.fillText(`Para ${recipientName}`, W / 2, 190);
      ctx.restore();

      // Current line, fading in/out at the edges of its scene.
      const line = lines[i] ?? "";
      const fadeIn = Math.min(1, (t - i * sceneDur) / TEXT_FADE_SEC);
      const fadeOut = Math.min(1, ((i + 1) * sceneDur - t) / TEXT_FADE_SEC);
      const alpha = Math.max(0, Math.min(fadeIn, fadeOut));
      if (alpha > 0 && line) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,0.85)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = "#FFFFFF";
        let fontSize = 68;
        let wrapped: string[] = [];
        while (fontSize >= 44) {
          ctx.font = `700 ${fontSize}px "Space Grotesk", system-ui, sans-serif`;
          wrapped = wrapText(
            line,
            W - 160,
            (s) => ctx.measureText(s).width,
          );
          if (wrapped.length <= 6) break;
          fontSize -= 6;
        }
        const lineH = fontSize * 1.35;
        const blockH = wrapped.length * lineH;
        let y = H - 560 - blockH / 2 + lineH / 2;
        for (const ln of wrapped) {
          ctx.fillText(ln, W / 2, y);
          y += lineH;
        }
        ctx.restore();
      }

      if (watermark) drawWatermark(ctx);
    },
    [loadedImgs, lines, recipientName, watermark, durationSec],
  );

  const preview = useCanvasPreview({
    canvasRef,
    durationSec,
    narrationRef: audioUrl ? narrationRef : undefined,
    musicRef: musicUrl ? musicRef : undefined,
    musicVolume: MUSIC_VOLUME,
    draw,
    active: ready,
  });

  // Paint the first frame once assets are ready.
  useEffect(() => {
    if (ready) preview.renderFrame(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const handleExport = async () => {
    const canvas = canvasRef.current;
    if (exporting || !canvas || durationSec == null) return;
    preview.stop();
    setExportError(null);
    setExported(null);
    setExporting(true);
    setExportProgress(0);
    let lastBucket = -1;
    try {
      const tracks: { url: string; volume: number }[] = [];
      if (audioUrl) tracks.push({ url: audioUrl, volume: 1 });
      if (musicUrl) tracks.push({ url: musicUrl, volume: MUSIC_VOLUME });
      const { blob, mimeType } = await startCanvasExport({
        canvas,
        durationSec,
        audioTracks: tracks,
        draw,
        clockTrackIndex: audioUrl ? 0 : undefined,
        onProgress: (t, total) => {
          const bucket = Math.floor((t / total) * 50);
          if (bucket !== lastBucket) {
            lastBucket = bucket;
            setExportProgress(t / total);
          }
        },
      });
      const fileName = `poetry-video.${mimeToExtension(mimeType)}`;
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
      <div className="relative w-full max-w-[300px]">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="h-auto w-full rounded-2xl border border-[#E4E4E7] bg-[#09090B] shadow-lg"
          aria-label={`Vista previa del video poema para ${recipientName}`}
        />
        {preview.playing && (
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1 overflow-hidden rounded-t-2xl bg-white/20"
          >
            <div
              className="h-full bg-[#EC4899] transition-[width] duration-200"
              style={{ width: `${Math.round(preview.progress * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Hidden preview audio elements */}
      {audioUrl && (
        <audio ref={narrationRef} src={audioUrl} preload="auto" className="hidden" />
      )}
      {musicUrl && (
        <audio ref={musicRef} src={musicUrl} preload="auto" className="hidden" />
      )}

      {loadError && (
        <p
          role="alert"
          className="flex items-center gap-2 text-sm text-[#DC2626]"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden />
          {loadError}
        </p>
      )}

      <div className="flex w-full max-w-[300px] flex-col gap-2">
        <div className="flex gap-2">
          <Button
            onClick={preview.toggle}
            disabled={!ready || exporting}
            className="min-h-[44px] flex-1 bg-gradient-to-r from-red-600 to-pink-500 text-white shadow-lg shadow-pink-500/25 transition-all duration-200 hover:opacity-95 active:scale-[0.98]"
            aria-label={preview.playing ? "Pausar vista previa" : "Reproducir vista previa"}
          >
            {preview.playing ? (
              <Pause aria-hidden />
            ) : (
              <Play aria-hidden />
            )}
            Vista previa
          </Button>
          <Button
            onClick={handleExport}
            disabled={!ready || exporting}
            className="min-h-[44px] flex-1 bg-gradient-to-r from-red-600 to-pink-500 font-semibold text-white shadow-lg shadow-pink-500/25 transition-all duration-200 hover:opacity-95 active:scale-[0.98]"
          >
            {exporting ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <Film aria-hidden />
            )}
            {exporting
              ? `${Math.round(exportProgress * 100)}%`
              : "Exportar video"}
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
          <p
            role="alert"
            className="flex items-start gap-2 text-sm text-[#DC2626]"
          >
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
            caption={`Te dedico este poema, ${recipientName} — hecho con Poetry AI`}
          />
        </div>
      )}
    </div>
  );
}
