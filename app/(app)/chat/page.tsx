"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AtSign,
  Clapperboard,
  Feather,
  Images,
  Loader2,
  Mail,
  Music,
  Quote,
  Flower2,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { PoemVideoComposer } from "@/components/composer/PoemVideoComposer";
import {
  PhotoUploader,
  SlideshowComposer,
} from "@/components/composer/SlideshowComposer";
import { QuoteVideoComposer } from "@/components/composer/QuoteVideoComposer";
import { LetterCard } from "@/components/cards/LetterCard";
import { ShareButtons } from "@/components/share/ShareButtons";

/* ---------------------------------- tipos --------------------------------- */

type FormatId = "poem" | "letter" | "video" | "slideshow" | "quote" | "song";

interface Recipient {
  id: string;
  name: string;
  nickname: string | null;
  relationship: string | null;
  notes: string | null;
  photo_url: string | null;
}

interface BriefOutput {
  text: string;
  lines?: string[];
}

interface BriefResult {
  dedicationId: string;
  intent?: {
    emotions?: string[];
    intensity?: number;
    occasion?: string | null;
    relationship?: string | null;
    register?: string | null;
  };
  output: BriefOutput;
  score?: number;
  iterations?: number;
  rosesBalance?: number;
}

interface SongResult {
  dedicationId: string;
  lyrics: string;
  music: string;
  score?: number;
  rosesBalance?: number;
}

/* --------------------------------- config --------------------------------- */

const FORMATS: Array<{
  id: FormatId;
  name: string;
  desc: string;
  cost: number;
  Icon: typeof Feather;
}> = [
  { id: "poem", name: "Poema", desc: "Versos para leer en voz baja", cost: 1, Icon: Feather },
  { id: "letter", name: "Carta de amor", desc: "Para guardarla por años", cost: 2, Icon: Mail },
  { id: "video", name: "Video narrado", desc: "Poema + voz + imágenes", cost: 10, Icon: Clapperboard },
  { id: "slideshow", name: "Slideshow de fotos", desc: "Tus fotos, con palabras", cost: 5, Icon: Images },
  { id: "quote", name: "Frase", desc: "Corta, directo al corazón", cost: 2, Icon: Quote },
  { id: "song", name: "Canción IA", desc: "Tema musical generado", cost: 15, Icon: Music },
];

const EMOTIONS = [
  "ternura",
  "nostalgia",
  "orgullo",
  "perdón",
  "gratitud",
  "alegría",
  "deseo",
  "melancolía",
  "motivación",
];

const INTENSITIES: Array<{ value: 1 | 2 | 3; label: string; hint: string }> = [
  { value: 1, label: "Sutil", hint: "Sonrisa suave" },
  { value: 2, label: "Profundo", hint: "Que se le erice la piel" },
  { value: 3, label: "Devastador", hint: "Lágrimas garantizadas" },
];

const FILE_NAMES: Record<FormatId, string> = {
  poem: "poema.png",
  letter: "carta.png",
  video: "poetry-video.mp4",
  slideshow: "poetry-slideshow.mp4",
  quote: "poetry-frase.mp4",
  song: "cancion-ia.mp3",
};

async function postJson<T>(
  url: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

/* ------------------------------ página: chat ------------------------------ */

export default function ChatPage() {
  const [brief, setBrief] = useState("");
  const [format, setFormat] = useState<FormatId>("poem");
  const [chips, setChips] = useState<string[]>([]);
  const [intensity, setIntensity] = useState<1 | 2 | 3>(2);

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selected, setSelected] = useState<Recipient | null>(null);
  const [mention, setMention] = useState<{
    query: string;
    start: number;
    caret: number;
  } | null>(null);

  const [phase, setPhase] = useState<"compose" | "working" | "result">("compose");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BriefResult | null>(null);
  const [song, setSong] = useState<SongResult | null>(null);

  const [narrateAudio, setNarrateAudio] = useState<string | null>(null);
  const [narrating, setNarrating] = useState(false);
  const [video, setVideo] = useState<{
    images: string[];
    audioUrl?: string;
    loading: boolean;
    imageError: boolean;
  } | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  const [exported, setExported] = useState<{ blob: Blob; name: string } | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  /* Carga de recipients para el autocompletado @apodo */
  useEffect(() => {
    fetch("/api/recipients", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { recipients: [] }))
      .then((d: { recipients: Recipient[] }) =>
        setRecipients(Array.isArray(d.recipients) ? d.recipients : []),
      )
      .catch(() => {});
  }, []);

  const notifyRoses = () => {
    window.dispatchEvent(new CustomEvent("poetry:roses-changed"));
  };

  /* ------------------------- autocompletado @apodo ------------------------- */

  const handleBriefChange = (value: string, caret: number) => {
    setBrief(value);
    const before = value.slice(0, caret);
    const m = before.match(/@([\p{L}\p{N}_.-]*)$/u);
    if (m && m.index !== undefined) {
      setMention({ query: m[1].toLowerCase(), start: m.index, caret });
    } else {
      setMention(null);
    }
  };

  const mentionMatches = mention
    ? recipients
        .filter((r) => {
          const nick = (r.nickname ?? "").toLowerCase();
          const name = r.name.toLowerCase();
          return (
            (nick && nick.startsWith(mention.query)) ||
            name.includes(mention.query)
          );
        })
        .filter((r) => r.nickname)
        .slice(0, 6)
    : [];

  const insertMention = (r: Recipient) => {
    if (!mention || !r.nickname) return;
    const token = `@${r.nickname} `;
    const next =
      brief.slice(0, mention.start) + token + brief.slice(mention.caret);
    setBrief(next);
    setMention(null);
    setSelected(r);
    textareaRef.current?.focus();
    const pos = mention.start + token.length;
    requestAnimationFrame(() =>
      textareaRef.current?.setSelectionRange(pos, pos),
    );
  };

  const toggleChip = (e: string) =>
    setChips((prev) =>
      prev.includes(e) ? prev.filter((c) => c !== e) : [...prev, e],
    );

  /* --------------------------------- crear --------------------------------- */

  const readError = (status: number, data: { error?: string }) => {
    if (status === 402)
      return "Te quedaste sin rosas para esto. Tranquilo: cada mes se recargan gratis, o baja el formato y vuelve a intentarlo.";
    if (data.error) return data.error;
    return "Algo falló al crear tu detalle. Inténtalo de nuevo en un momento.";
  };

  const handleCreate = async () => {
    if (!brief.trim()) {
      setError("Cuéntame primero qué quieres provocar.");
      textareaRef.current?.focus();
      return;
    }
    setError(null);
    setPhase("working");
    setResult(null);
    setSong(null);
    setNarrateAudio(null);
    setVideo(null);
    setPhotos([]);
    setExported(null);
    setShareUrl(null);

    const mentionToken =
      selected?.nickname != null
        ? new RegExp(`@${selected.nickname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "gu")
        : null;
    const cleanBrief = (
      mentionToken ? brief.replace(mentionToken, "") : brief
    ).trim();

    const payload: Record<string, unknown> = {
      brief: cleanBrief,
      format,
      emotionTarget: chips.length ? chips.join(", ") : undefined,
      intensity,
      ...(selected ? { recipientId: selected.id } : {}),
    };

    try {
      if (format === "song") {
        const { ok, status, data } = await postJson<SongResult>(
          "/api/poetry/song",
          payload,
        );
        if (!ok) {
          setPhase("compose");
          setError(readError(status, data as { error?: string }));
          return;
        }
        setSong(data);
        notifyRoses();
      } else {
        const { ok, status, data } = await postJson<BriefResult>(
          "/api/poetry/brief",
          payload,
        );
        if (!ok) {
          setPhase("compose");
          setError(readError(status, data as { error?: string }));
          return;
        }
        setResult(data);
        notifyRoses();
        if (format === "video") void buildVideoAssets(data.output.lines ?? []);
      }
      setPhase("result");
      requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch {
      setPhase("compose");
      setError(
        "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
      );
    }
  };

  /* ------------------------------- video flow ------------------------------ */

  const buildVideoAssets = async (lines: string[]) => {
    setVideo({ images: [], loading: true, imageError: false });
    const base =
      "Romantic cinematic illustration, vertical 9:16, soft pink and warm tones, dreamy bokeh, tender and emotional";
    const insp = brief.trim().slice(0, 140);
    const prompts = [
      `${base}, couple silhouette at sunset. Inspired by: ${insp}`,
      `${base}, blooming flowers under a starry sky. Inspired by: ${insp}`,
    ];

    const images: string[] = [];
    for (const prompt of prompts) {
      try {
        const { ok, data } = await postJson<{ image: string }>(
          "/api/poetry/image",
          { prompt },
        );
        if (ok && data.image) images.push(data.image);
      } catch {
        /* seguimos sin esa imagen */
      }
    }

    let audioUrl: string | undefined;
    if (lines.length) {
      try {
        const { ok, data } = await postJson<{ audio: string }>(
          "/api/poetry/narrate",
          { text: lines.join("\n") },
        );
        if (ok && data.audio) audioUrl = data.audio;
      } catch {
        /* degradación: el video funciona sin voz */
      }
    }

    setVideo({
      images,
      audioUrl,
      loading: false,
      imageError: images.length === 0,
    });
  };

  /* ------------------------------ narrar poema ----------------------------- */

  const handleNarrate = async (text: string) => {
    setNarrating(true);
    setNarrateAudio(null);
    try {
      const { ok, data } = await postJson<{ audio: string }>(
        "/api/poetry/narrate",
        { text },
      );
      if (ok && data.audio) {
        setNarrateAudio(data.audio);
      } else {
        setError(
          "No pudimos generar la voz esta vez, pero tu poema quedó perfecto.",
        );
      }
    } catch {
      setError(
        "No pudimos generar la voz esta vez, pero tu poema quedó perfecto.",
      );
    } finally {
      setNarrating(false);
    }
  };

  /* -------------------------------- compartir ------------------------------- */

  const handleShareLink = async () => {
    const dedicationId = result?.dedicationId ?? song?.dedicationId;
    if (!dedicationId || sharing) return;
    setSharing(true);
    try {
      const { ok, data } = await postJson<{ url: string; id: string }>(
        "/api/share",
        { dedicationId },
      );
      if (ok && data.url) {
        setShareUrl(`${window.location.origin}${data.url}`);
      } else {
        setError("No pudimos crear el link para compartir. Inténtalo de nuevo.");
      }
    } catch {
      setError("No pudimos crear el link para compartir. Inténtalo de nuevo.");
    } finally {
      setSharing(false);
    }
  };

  const handleExported = (name: string) => (blob: Blob) =>
    setExported({ blob, name });

  const reset = () => {
    setPhase("compose");
    setBrief("");
    setSelected(null);
    setChips([]);
    setResult(null);
    setSong(null);
    setNarrateAudio(null);
    setVideo(null);
    setPhotos([]);
    setExported(null);
    setShareUrl(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* --------------------------------- render --------------------------------- */

  const recipientName = selected?.name ?? "ti";
  const dedicationId = result?.dedicationId ?? song?.dedicationId ?? null;
  const shareCaption = `Te dedico esto con todo mi corazón${recipientName === "ti" ? "" : `, ${recipientName}`} — hecho con Poetry AI`;

  const renderFormatResult = () => {
    if (format === "song" && song) {
      return (
        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tema musical IA
          </p>
          <div className="whitespace-pre-wrap text-base leading-relaxed">
            {song.lyrics}
          </div>
          <audio
            controls
            src={song.music}
            className="w-full"
            aria-label="Tema musical generado por IA"
          />
          <p className="text-xs text-muted-foreground">
            Música instrumental + recitado generados por IA. Sin voces reales
            (todavía).
          </p>
        </div>
      );
    }

    if (!result) return null;
    const { output } = result;

    switch (format) {
      case "poem":
        return (
          <div className="space-y-4">
            <div className="whitespace-pre-wrap text-lg leading-relaxed">
              {output.text}
            </div>
            {narrateAudio ? (
              <audio
                controls
                src={narrateAudio}
                className="w-full"
                aria-label="Poema narrado"
              />
            ) : (
              <button
                type="button"
                onClick={() => handleNarrate(output.text)}
                disabled={narrating}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border-2 border-foreground px-4 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-px disabled:opacity-50"
              >
                {narrating ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Volume2 className="size-4" aria-hidden />
                )}
                {narrating ? "Narrando…" : "Narrar con voz IA"}
              </button>
            )}
          </div>
        );

      case "letter":
        return (
          <LetterCard
            letter={output.text}
            recipientName={recipientName}
            onSharePNG={(blob) => setExported({ blob, name: FILE_NAMES.letter })}
          />
        );

      case "quote":
        return <QuoteVideoComposer text={output.text} watermark />;

      case "video": {
        const lines = output.lines ?? [];
        if (!video || video.loading) {
          return (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Loader2 className="size-8 animate-spin text-pink-500" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Generando imágenes y voz para tu video…
              </p>
            </div>
          );
        }
        if (video.imageError && lines.length === 0) {
          return (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No pudimos generar el video esta vez. Tu poema quedó guardado.
              <div className="mt-3 whitespace-pre-wrap text-left text-base text-foreground">
                {output.text}
              </div>
            </div>
          );
        }
        return (
          <PoemVideoComposer
            lines={lines.length ? lines : [output.text]}
            images={
              video.images.length
                ? video.images
                : [
                    "data:image/svg+xml," +
                      encodeURIComponent(
                        `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="100%" height="100%" fill="#fce7f3"/><text x="50%" y="50%" font-size="60" text-anchor="middle" fill="#ec4899">Poetry AI</text></svg>`,
                      ),
                  ]
            }
            audioUrl={video.audioUrl}
            recipientName={recipientName}
            watermark
            onExported={handleExported(FILE_NAMES.video)}
          />
        );
      }

      case "slideshow": {
        const captions = output.lines ?? [output.text];
        return (
          <div className="space-y-4">
            {photos.length === 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Sube de 3 a 10 fotos y las convertimos en un slideshow con tus
                  palabras.
                </p>
                <PhotoUploader onUploaded={(urls) => setPhotos(urls)} />
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setPhotos([])}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 text-sm font-medium text-pink-600 underline-offset-4 transition-colors duration-200 hover:underline"
                >
                  <X className="size-4" aria-hidden /> Cambiar fotos
                </button>
                <SlideshowComposer
                  photos={photos}
                  captions={captions}
                  recipientName={recipientName}
                  watermark
                  onExported={handleExported(FILE_NAMES.slideshow)}
                />
              </>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  /* ------------------------------- compose UI ------------------------------ */

  if (phase === "result") {
    const fmt = FORMATS.find((f) => f.id === format);
    return (
      <div ref={resultRef} className="space-y-5">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-pink-600">
            <Sparkles className="size-4" aria-hidden />
            Tu {fmt?.name.toLowerCase() ?? "detalle"} está listo
          </div>
          {renderFormatResult()}
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="text-base font-bold">Compártelo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mándaselo por WhatsApp o con un link que es el regalo en sí.
          </p>
          <div className="mt-4">
            {shareUrl ? (
              <ShareButtons
                file={exported?.blob ?? null}
                fileName={exported?.name ?? FILE_NAMES[format]}
                shareUrl={shareUrl}
                caption={shareCaption}
              />
            ) : (
              <button
                type="button"
                onClick={handleShareLink}
                disabled={sharing || !dedicationId}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-pink-500/25 transition-all duration-200 hover:-translate-y-px hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
              >
                {sharing ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {sharing ? "Creando link…" : "Crear link para compartir"}
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-lg border-2 border-foreground px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-px"
        >
          Crear otro detalle
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          ¿Qué quieres provocar?
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escríbelo como lo sientes. El Emotion Engine se encarga del resto.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </div>
      )}

      {/* Brief con autocompletado @apodo */}
      <div className="relative">
        <label htmlFor="brief" className="mb-2 block text-sm font-semibold">
          Tu brief emocional
        </label>
        <textarea
          id="brief"
          ref={textareaRef}
          value={brief}
          onChange={(e) =>
            handleBriefChange(e.target.value, e.target.selectionStart ?? 0)
          }
          onKeyDown={(e) => {
            if (e.key === "Escape") setMention(null);
          }}
          rows={4}
          placeholder="quiero que llore de felicidad… (tip: escribe @ para dedicárselo a alguien)"
          className="w-full resize-none rounded-xl border border-input bg-background p-4 text-base leading-relaxed transition-colors duration-200 placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
        {mention && mentionMatches.length > 0 && (
          <div
            role="listbox"
            aria-label="Personas"
            className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border bg-popover shadow-lg"
          >
            {mentionMatches.map((r) => (
              <button
                key={r.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => insertMention(r)}
                className="flex min-h-[48px] w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm transition-colors duration-150 hover:bg-accent"
              >
                <AtSign className="size-4 text-pink-500" aria-hidden />
                <span className="font-semibold">@{r.nickname}</span>
                <span className="text-muted-foreground">{r.name}</span>
              </button>
            ))}
          </div>
        )}
        {selected && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1.5 text-sm font-medium text-pink-700 dark:bg-pink-950 dark:text-pink-300">
            <AtSign className="size-3.5" aria-hidden />
            Para {selected.name}
            <button
              type="button"
              aria-label="Quitar destinatario"
              onClick={() => setSelected(null)}
              className="cursor-pointer rounded-full p-0.5 transition-colors duration-150 hover:bg-pink-200 dark:hover:bg-pink-800"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        )}
        {!selected && recipients.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Guarda a tus personas en{" "}
            <Link
              href="/recipients"
              className="font-semibold text-pink-600 underline-offset-2 hover:underline"
            >
              Personas
            </Link>{" "}
            y llámalas con @apodo cuando crees un detalle.
          </p>
        )}
      </div>

      {/* Emociones objetivo */}
      <div>
        <p className="mb-2 text-sm font-semibold">
          ¿Qué emoción quieres tocar?{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {EMOTIONS.map((e) => {
            const active = chips.includes(e);
            return (
              <button
                key={e}
                type="button"
                aria-pressed={active}
                onClick={() => toggleChip(e)}
                className={`min-h-[40px] cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition-all duration-200 ${
                  active
                    ? "border-transparent bg-gradient-to-r from-red-600 to-pink-500 text-white shadow-md shadow-pink-500/25"
                    : "border-border bg-card hover:border-pink-300"
                }`}
              >
                {e}
              </button>
            );
          })}
        </div>
      </div>

      {/* Intensidad */}
      <div>
        <p className="mb-2 text-sm font-semibold">Intensidad</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Intensidad">
          {INTENSITIES.map(({ value, label, hint }) => {
            const active = intensity === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setIntensity(value)}
                className={`min-h-[56px] cursor-pointer rounded-xl border px-2 py-2 text-center transition-all duration-200 ${
                  active
                    ? "border-pink-500 bg-pink-50 dark:bg-pink-950"
                    : "border-border bg-card hover:border-pink-300"
                }`}
              >
                <span
                  className={`block text-sm font-bold ${
                    active ? "text-pink-600 dark:text-pink-400" : ""
                  }`}
                >
                  {label}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Formatos */}
      <div>
        <p className="mb-2 text-sm font-semibold">Elige el formato</p>
        <div
          className="grid grid-cols-2 gap-3"
          role="radiogroup"
          aria-label="Formato"
        >
          {FORMATS.map(({ id, name, desc, cost, Icon }) => {
            const active = format === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setFormat(id)}
                className={`min-h-[96px] cursor-pointer rounded-2xl border-2 p-3 text-left transition-all duration-200 ${
                  active
                    ? "border-pink-500 bg-pink-50/60 shadow-md shadow-pink-500/20 dark:bg-pink-950/40"
                    : "border-border bg-card hover:border-pink-300"
                }`}
              >
                <span className="flex items-center justify-between">
                  <Icon
                    className={`size-5 ${
                      active ? "text-pink-500" : "text-muted-foreground"
                    }`}
                    aria-hidden
                  />
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-red-600 to-pink-500 px-2 py-0.5 text-xs font-bold text-white">
                    <Flower2 className="size-3" aria-hidden />
                    {cost}
                  </span>
                </span>
                <span className="mt-2 block text-sm font-bold">{name}</span>
                <span className="block text-xs text-muted-foreground">{desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Crear */}
      <button
        type="button"
        onClick={handleCreate}
        disabled={phase === "working"}
        className="inline-flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-pink-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-pink-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
      >
        {phase === "working" ? (
          <>
            <Loader2 className="size-5 animate-spin" aria-hidden />
            Creando magia…
          </>
        ) : (
          <>
            <Sparkles className="size-5" aria-hidden />
            Crear · {FORMATS.find((f) => f.id === format)?.cost}{" "}
            {FORMATS.find((f) => f.id === format)?.cost === 1 ? "rosa" : "rosas"}
          </>
        )}
      </button>

      {phase === "working" && (
        <p className="text-center text-sm text-muted-foreground">
          El Emotion Engine está escribiendo, criticando y puliendo tu detalle…
        </p>
      )}
    </div>
  );
}
