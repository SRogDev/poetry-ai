"use client";

// Shared client-side canvas video pipeline for Poetry AI composers.
// Pure, testable helpers (mime pick, timeline math, Ken Burns geometry)
// plus the MediaRecorder export session and a preview-playback hook.

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export const MP4_MIME = "video/mp4";
export const WEBM_MIME = "video/webm;codecs=vp9";
export const WATERMARK_TEXT = "Hecho con Poetry AI";

/** Pick the best mime type the browser's MediaRecorder supports. */
export function pickVideoMimeType(
  isTypeSupported?: (mime: string) => boolean,
): string {
  const check =
    isTypeSupported ??
    (typeof MediaRecorder !== "undefined" &&
    typeof MediaRecorder.isTypeSupported === "function"
      ? MediaRecorder.isTypeSupported.bind(MediaRecorder)
      : undefined);
  if (check && check(MP4_MIME)) return MP4_MIME;
  return WEBM_MIME;
}

export function mimeToExtension(mime: string): "mp4" | "webm" {
  return mime.includes("mp4") ? "mp4" : "webm";
}

/** Scene index for time t given fixed-length scenes; clamped to [0, sceneCount-1]. */
export function sceneAt(
  t: number,
  sceneCount: number,
  sceneDuration: number,
): number {
  if (sceneCount <= 0) return 0;
  const i = Math.floor(Math.max(0, t) / Math.max(sceneDuration, 0.001));
  return Math.min(i, sceneCount - 1);
}

/** Overshoot easing for kinetic typography pops. */
export function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const t = Math.min(1, Math.max(0, x)) - 1;
  return 1 + c3 * t * t * t + c1 * t * t;
}

export interface KenBurnsRect {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

/**
 * Cover-fit Ken Burns draw rect: slow zoom 1 -> 1.15 plus a seeded pan
 * sweep. The rect always fully covers the canvas (no empty edges).
 */
export function kenBurnsDrawParams(
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number,
  progress: number, // 0..1 within the scene
  seed: number, // 0..1 per-scene variation
): KenBurnsRect {
  const p = Math.min(1, Math.max(0, progress));
  const baseScale = Math.max(canvasW / imgW, canvasH / imgH);
  const zoom = 1 + 0.15 * p;
  const dw = imgW * baseScale * zoom;
  const dh = imgH * baseScale * zoom;
  const maxX = Math.max(0, (dw - canvasW) / 2);
  const maxY = Math.max(0, (dh - canvasH) / 2);
  const angle = seed * Math.PI * 2;
  const sweep = Math.sin(p * Math.PI); // 0 at ends, 1 mid-scene
  const dx = -maxX + Math.cos(angle) * maxX * sweep;
  const dy = -maxY + Math.sin(angle) * maxY * sweep;
  return { dx, dy, dw, dh };
}

let reducedMotion: boolean | null = null;
function prefersReducedMotion(): boolean {
  if (reducedMotion === null) {
    reducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  return reducedMotion;
}

/** Draw an image cover-fit with the Ken Burns transform. */
export function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  progress: number,
  seed: number,
): void {
  const canvas = ctx.canvas;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const p = prefersReducedMotion() ? 0.5 : progress;
  const r = kenBurnsDrawParams(w, h, canvas.width, canvas.height, p, seed);
  ctx.drawImage(img, r.dx, r.dy, r.dw, r.dh);
}

/** Burn the "Hecho con Poetry AI" watermark into the canvas corner. */
export function drawWatermark(ctx: CanvasRenderingContext2D): void {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  ctx.save();
  ctx.font = `600 ${Math.round(cw * 0.03)}px "Space Grotesk", system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 10;
  ctx.fillText(WATERMARK_TEXT, cw - 48, ch - 48);
  ctx.restore();
}

/** Load an image element; rejects with a Spanish message on failure. */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("No se pudo cargar una imagen. Revisa tu conexión."));
    img.src = url;
  });
}

/** Resolve an audio URL's duration in seconds; NaN when it can't be read. */
export function getAudioDuration(
  url: string,
  timeoutMs = 8000,
): Promise<number> {
  return new Promise((resolve) => {
    const el = new Audio();
    el.preload = "metadata";
    const done = (d: number) => {
      el.removeAttribute("src");
      el.load();
      resolve(d);
    };
    const timer = window.setTimeout(() => done(NaN), timeoutMs);
    el.onloadedmetadata = () => {
      window.clearTimeout(timer);
      done(el.duration);
    };
    el.onerror = () => {
      window.clearTimeout(timer);
      done(NaN);
    };
    el.src = url;
  });
}

export type ExportErrorCode =
  | "NO_RECORDER"
  | "NO_VIDEO_TRACK"
  | "EMPTY"
  | "UNKNOWN";

export class ExportError extends Error {
  code: ExportErrorCode;
  constructor(code: ExportErrorCode, message: string) {
    super(message);
    this.name = "ExportError";
    this.code = code;
  }
}

export interface ExportAudioTrack {
  url: string;
  volume: number; // 0..1 (music ~0.15, narration 1)
}

export interface ExportResult {
  blob: Blob;
  mimeType: string;
}

/**
 * Record `durationSec` seconds of canvas + audio tracks into a video Blob.
 * Audio elements are created fresh per export and routed through an
 * AudioContext -> MediaStreamDestination so preview elements stay untouched
 * (createMediaElementSource can only be bound once per element).
 */
export async function startCanvasExport(opts: {
  canvas: HTMLCanvasElement;
  durationSec: number;
  audioTracks?: ExportAudioTrack[];
  draw: (ctx: CanvasRenderingContext2D, t: number) => void;
  clockTrackIndex?: number;
  onProgress?: (elapsed: number, total: number) => void;
}): Promise<ExportResult> {
  if (typeof MediaRecorder === "undefined") {
    throw new ExportError(
      "NO_RECORDER",
      "Tu navegador no puede grabar video (MediaRecorder no disponible). Prueba con Chrome o Safari actualizado.",
    );
  }
  const mimeType = pickVideoMimeType();
  const canvasStream = opts.canvas.captureStream(30);
  const videoTracks = canvasStream.getVideoTracks();
  if (videoTracks.length === 0) {
    throw new ExportError(
      "NO_VIDEO_TRACK",
      "No se pudo capturar el video del lienzo. Inténtalo de nuevo.",
    );
  }

  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  const elements: HTMLAudioElement[] = [];
  try {
    for (const track of opts.audioTracks ?? []) {
      const el = new Audio(track.url);
      el.preload = "auto";
      el.crossOrigin = "anonymous";
      const src = audioCtx.createMediaElementSource(el);
      const gain = audioCtx.createGain();
      gain.gain.value = track.volume;
      src.connect(gain);
      gain.connect(dest);
      gain.connect(audioCtx.destination); // monitor while exporting
      elements.push(el);
    }
    await audioCtx.resume();
  } catch {
    await audioCtx.close().catch(() => {});
    throw new ExportError(
      "UNKNOWN",
      "No se pudo preparar el audio para la exportación.",
    );
  }

  const combined = new MediaStream([
    ...videoTracks,
    ...dest.stream.getAudioTracks(),
  ]);
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(combined, { mimeType });
  } catch {
    await audioCtx.close().catch(() => {});
    throw new ExportError(
      "NO_RECORDER",
      "Tu navegador no soporta este formato de video. Prueba con Chrome o Safari actualizado.",
    );
  }

  const chunks: Blob[] = [];
  recorder.ondataavailable = (ev: BlobEvent) => {
    if (ev.data && ev.data.size > 0) chunks.push(ev.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  recorder.start(250);

  const clockEl =
    opts.clockTrackIndex != null ? elements[opts.clockTrackIndex] : undefined;
  let clockOk = false;
  if (clockEl) {
    try {
      clockEl.currentTime = 0;
      await clockEl.play();
      clockOk = true;
    } catch {
      clockOk = false; // fall back to the wall clock
    }
  }
  for (const el of elements) {
    if (el === clockEl) continue;
    try {
      el.currentTime = 0;
      await el.play();
    } catch {
      // sigue sin esa pista de audio
    }
  }

  const ctx = opts.canvas.getContext("2d");
  if (!ctx) {
    recorder.stop();
    await audioCtx.close().catch(() => {});
    throw new ExportError("UNKNOWN", "No se pudo acceder al lienzo de video.");
  }

  const start = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t =
        clockOk && clockEl
          ? clockEl.currentTime
          : (performance.now() - start) / 1000;
      if (t >= opts.durationSec) {
        resolve();
        return;
      }
      opts.draw(ctx, t);
      opts.onProgress?.(t, opts.durationSec);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  for (const el of elements) {
    try {
      el.pause();
    } catch {
      // noop
    }
    el.removeAttribute("src");
    el.load();
  }
  recorder.stop();
  await stopped;
  for (const track of combined.getTracks()) {
    try {
      track.stop();
    } catch {
      // noop
    }
  }
  await audioCtx.close().catch(() => {});

  const blob = new Blob(chunks, { type: mimeType });
  if (blob.size === 0) {
    throw new ExportError(
      "EMPTY",
      "La exportación salió vacía. Inténtalo de nuevo.",
    );
  }
  return { blob, mimeType };
}

export interface PreviewHandle {
  playing: boolean;
  progress: number; // 0..1
  toggle: () => void;
  stop: () => void;
  renderFrame: (t: number) => void;
}

/**
 * Drive a canvas preview: draws `draw(ctx, t)` on rAF while playing,
 * synced to the narration element's currentTime when available,
 * otherwise to a wall clock. Preview uses the component's own
 * <audio> elements; export builds separate ones.
 */
export function useCanvasPreview(opts: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  durationSec: number | null;
  narrationRef?: RefObject<HTMLAudioElement | null>;
  musicRef?: RefObject<HTMLAudioElement | null>;
  musicVolume?: number;
  draw: (ctx: CanvasRenderingContext2D, t: number) => void;
  active: boolean;
}): PreviewHandle {
  const { canvasRef, narrationRef, musicRef } = opts;
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const stateRef = useRef(opts);
  stateRef.current = opts;

  const renderFrame = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) stateRef.current.draw(ctx, t);
    },
    [canvasRef],
  );

  const stop = useCallback(() => {
    try {
      narrationRef?.current?.pause();
    } catch {
      // noop
    }
    try {
      musicRef?.current?.pause();
    } catch {
      // noop
    }
    setPlaying(false);
  }, [narrationRef, musicRef]);

  const toggle = useCallback(() => {
    const s = stateRef.current;
    if (s.durationSec == null || !s.active) return;
    const n = s.narrationRef?.current;
    const m = s.musicRef?.current;
    // read current playing state via a data attribute-free approach:
    // if either audio is playing, treat as playing
    const isPlaying =
      (n && !n.paused && !n.ended) || (m && !m.paused && !m.ended);
    if (isPlaying) {
      try {
        n?.pause();
      } catch {
        // noop
      }
      try {
        m?.pause();
      } catch {
        // noop
      }
      setPlaying(false);
      return;
    }
    if (n && s.narrationRef) {
      try {
        n.currentTime = 0;
      } catch {
        // noop
      }
      n.play().catch(() => {});
    }
    if (m) {
      try {
        m.currentTime = 0;
        if (s.musicVolume != null) m.volume = s.musicVolume;
      } catch {
        // noop
      }
      m.play().catch(() => {});
    }
    setPlaying(true);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const s = stateRef.current;
    if (s.durationSec == null || !s.active) {
      setPlaying(false);
      return;
    }
    let raf = 0;
    let lastBucket = -1;
    const start = performance.now();
    const loop = () => {
      const cur = stateRef.current;
      const total = cur.durationSec;
      if (total == null || !cur.active) {
        setPlaying(false);
        return;
      }
      const n = cur.narrationRef?.current;
      const useAudioClock =
        n && !n.paused && Number.isFinite(n.duration) && n.duration > 0;
      const t = useAudioClock
        ? n.currentTime
        : (performance.now() - start) / 1000;
      if (t >= total) {
        try {
          cur.narrationRef?.current?.pause();
        } catch {
          // noop
        }
        try {
          cur.musicRef?.current?.pause();
        } catch {
          // noop
        }
        setPlaying(false);
        setProgress(1);
        return;
      }
      const canvas = cur.canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) cur.draw(ctx, t);
      const bucket = Math.floor(t * 20);
      if (bucket !== lastBucket) {
        lastBucket = bucket;
        setProgress(t / total);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // Stop audio on unmount.
  useEffect(() => {
    const n = narrationRef?.current;
    const m = musicRef?.current;
    return () => {
      try {
        n?.pause();
      } catch {
        // noop
      }
      try {
        m?.pause();
      } catch {
        // noop
      }
    };
  }, [narrationRef, musicRef]);

  return { playing, progress, toggle, stop, renderFrame };
}
