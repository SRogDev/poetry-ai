"use client";

// Slideshow composer: Ken Burns over user photos with one caption per
// photo, optional music, same export/watermark pipeline as the poem
// composer. Includes PhotoUploader (Supabase Storage bucket "dedications").

import { useCallback, useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import {
  AlertTriangle,
  Film,
  ImagePlus,
  Loader2,
  Pause,
  Play,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareButtons } from "@/components/share/ShareButtons";
import { wrapText } from "@/components/cards/letterText";
import { createClient } from "@/lib/supabase/client";
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
import {
  MAX_DIMENSION,
  MAX_PHOTOS,
  MIN_PHOTOS,
  computeDownscaleSize,
  validateImageFiles,
} from "./photoFiles";

const W = 1080;
const H = 1920;
const CROSSFADE_SEC = 0.6;
const TEXT_FADE_SEC = 0.4;
const MUSIC_VOLUME = 0.2;

interface ExportedFile {
  blob: Blob;
  mimeType: string;
  fileName: string;
}

export function PhotoUploader(props: {
  onUploaded: (urls: string[]) => void;
}): JSX.Element {
  const { onUploaded } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);

  const handleFiles = async (fileList: FileList | null) => {
    const files = fileList ? Array.from(fileList) : [];
    const validation = validateImageFiles(files);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }
    setError(null);
    setUploading(true);
    setDone(0);
    setTotal(files.length);
    try {
      const supabase = createClient();
      const urls: string[] = [];
      for (const file of files) {
        // Downscale client-side so uploads stay light.
        const bitmap = await createImageBitmap(file);
        const { w, h } = computeDownscaleSize(
          bitmap.width,
          bitmap.height,
          MAX_DIMENSION,
        );
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("No se pudo procesar la imagen.");
        ctx.drawImage(bitmap, 0, 0, w, h);
        bitmap.close();
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.85),
        );
        if (!blob) throw new Error("No se pudo procesar la imagen.");

        const path = `${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("dedications")
          .upload(path, blob, { contentType: "image/jpeg", upsert: true });
        if (uploadError)
          throw new Error(
            "No se pudo subir una foto. Revisa tu conexión e inténtalo de nuevo.",
          );
        const { data } = supabase.storage
          .from("dedications")
          .getPublicUrl(path);
        urls.push(data.publicUrl);
        setDone((d) => d + 1);
      }
      setPreviews(urls);
      onUploaded(urls);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudieron subir las fotos.",
      );
    } finally {
      setUploading(false);
    }
  };

  const removePreview = (index: number) => {
    const next = previews.filter((_, i) => i !== index);
    setPreviews(next);
    onUploaded(next);
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        aria-label="Seleccionar fotos"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-pink-500 px-4 py-4 text-sm font-semibold text-white shadow-lg shadow-pink-500/25 transition-all duration-200 hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : (
          <ImagePlus className="h-5 w-5" aria-hidden />
        )}
        {uploading
          ? `Subiendo ${done}/${total}…`
          : `Subir fotos (${MIN_PHOTOS}–${MAX_PHOTOS})`}
      </button>
      <p className="mt-2 text-xs text-[#475569]">
        JPG o PNG · se reducen a {MAX_DIMENSION}px para subir más rápido.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-2 flex items-start gap-2 text-sm text-[#DC2626]"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {previews.map((url, i) => (
            <div key={url} className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Foto ${i + 1}`}
                className="h-full w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => removePreview(i)}
                aria-label={`Quitar foto ${i + 1}`}
                className="absolute top-1 right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-opacity duration-200 hover:bg-black/80"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SlideshowComposer(props: {
  photos: string[];
  captions: string[];
  musicUrl?: string;
  recipientName: string;
  watermark: boolean;
  onExported?: (blob: Blob, mimeType: string) => void;
}): JSX.Element {
  const { photos, captions, musicUrl, recipientName, watermark, onExported } =
    props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);

  const [loadedImgs, setLoadedImgs] = useState<HTMLImageElement[]>([]);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exported, setExported] = useState<ExportedFile | null>(null);

  const ready = loadedImgs.length > 0 && durationSec != null && durationSec > 0;

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setLoadedImgs([]);
    if (photos.length === 0) {
      setLoadError("Sube fotos para crear el pase de diapositivas.");
      return;
    }
    Promise.all(photos.map(loadImage))
      .then((imgs) => {
        if (!cancelled) setLoadedImgs(imgs);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setLoadError(
            e instanceof Error ? e.message : "No se pudieron cargar las fotos.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [photos]);

  useEffect(() => {
    let cancelled = false;
    setDurationSec(null);
    const fallback = Math.max(1, photos.length) * 4;
    if (!musicUrl) {
      setDurationSec(fallback);
      return;
    }
    getAudioDuration(musicUrl).then((d) => {
      if (cancelled) return;
      setDurationSec(Number.isFinite(d) && d > 0 ? d : fallback);
    });
    return () => {
      cancelled = true;
    };
  }, [musicUrl, photos.length]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, t: number) => {
      ctx.fillStyle = "#09090B";
      ctx.fillRect(0, 0, W, H);
      if (loadedImgs.length === 0 || durationSec == null) return;

      const sceneCount = loadedImgs.length;
      const sceneDur = durationSec / sceneCount;
      const i = sceneAt(t, sceneCount, sceneDur);
      const p = Math.min(
        1,
        Math.max(0, (t - i * sceneDur) / Math.max(sceneDur, 0.001)),
      );

      drawCoverImage(ctx, loadedImgs[i], p, (i % 8) / 8);

      if (i < sceneCount - 1 && sceneDur > CROSSFADE_SEC) {
        const fadeStart = 1 - CROSSFADE_SEC / sceneDur;
        if (p > fadeStart) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, (p - fadeStart) / (1 - fadeStart));
          drawCoverImage(ctx, loadedImgs[i + 1], 0, ((i + 1) % 8) / 8);
          ctx.restore();
        }
      }

      const shade = ctx.createLinearGradient(0, H * 0.55, 0, H);
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(1, "rgba(0,0,0,0.65)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, W, H);

      // Caption for this photo.
      const caption = captions[i] ?? "";
      const fadeIn = Math.min(1, (t - i * sceneDur) / TEXT_FADE_SEC);
      const fadeOut = Math.min(1, ((i + 1) * sceneDur - t) / TEXT_FADE_SEC);
      const alpha = Math.max(0, Math.min(fadeIn, fadeOut));
      if (alpha > 0 && caption) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,0.85)";
        ctx.shadowBlur = 16;
        ctx.fillStyle = "#FFFFFF";
        let fontSize = 56;
        let wrapped: string[] = [];
        while (fontSize >= 40) {
          ctx.font = `600 ${fontSize}px "Space Grotesk", system-ui, sans-serif`;
          wrapped = wrapText(caption, W - 160, (s) => ctx.measureText(s).width);
          if (wrapped.length <= 4) break;
          fontSize -= 4;
        }
        const lineH = fontSize * 1.35;
        const blockH = wrapped.length * lineH;
        let y = H - 420 - blockH / 2 + lineH / 2;
        for (const ln of wrapped) {
          ctx.fillText(ln, W / 2, y);
          y += lineH;
        }
        ctx.restore();
      }

      // Photo counter.
      ctx.save();
      ctx.font = `500 32px "Space Grotesk", system-ui, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 8;
      ctx.fillText(`${i + 1} / ${sceneCount}`, W - 48, 64);
      ctx.restore();

      if (watermark) drawWatermark(ctx);
    },
    [loadedImgs, captions, watermark, durationSec],
  );

  const preview = useCanvasPreview({
    canvasRef,
    durationSec,
    musicRef: musicUrl ? musicRef : undefined,
    musicVolume: MUSIC_VOLUME,
    draw,
    active: ready,
  });

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
      const tracks = musicUrl ? [{ url: musicUrl, volume: MUSIC_VOLUME }] : [];
      const { blob, mimeType } = await startCanvasExport({
        canvas,
        durationSec,
        audioTracks: tracks,
        draw,
        onProgress: (t, total) => {
          const bucket = Math.floor((t / total) * 50);
          if (bucket !== lastBucket) {
            lastBucket = bucket;
            setExportProgress(t / total);
          }
        },
      });
      const fileName = `poetry-slideshow.${mimeToExtension(mimeType)}`;
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
          className="h-auto w-full rounded-2xl border border-[#E4E4E7] bg-[#09090B] shadow-lg"
          aria-label={`Vista previa del pase de fotos para ${recipientName}`}
        />
      </div>

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
            {preview.playing ? <Pause aria-hidden /> : <Play aria-hidden />}
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
            caption={`Un pase de fotos para ti, ${recipientName} — hecho con Poetry AI`}
          />
        </div>
      )}
    </div>
  );
}
