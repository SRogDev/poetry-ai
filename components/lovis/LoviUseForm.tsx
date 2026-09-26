"use client";

// "Use this Lovi" flow: fill the slots → live preview → create the
// dedication and get a share link (/s/<id>).

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Flame,
  Heart,
  Loader2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoviRenderer } from "@/components/lovis/LoviRenderer";
import {
  BTN_PRIMARY,
  ICON_ROSE,
  TEXT_GRADIENT,
} from "@/components/lovis/brand";
import { ROSE_COSTS } from "@/lib/roses/costs";
import type { LoviData, LoviSlot } from "@/lib/lovis/slots";

export interface UseLovi {
  id: string;
  name: string;
  description: string | null;
  code: string;
  slots: LoviSlot[];
  uses_count: number;
  likes_count: number;
  liked: boolean;
}

type FieldValues = Record<string, string>;

function lines(value: string): string[] {
  return value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function LoviUseForm({ lovi }: { lovi: UseLovi }) {
  const [values, setValues] = useState<FieldValues>({});
  const [liked, setLiked] = useState(lovi.liked);
  const [likesCount, setLikesCount] = useState(lovi.likes_count);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  /** Build window.LOVI_DATA from the form, honoring each slot type. */
  const data: LoviData = useMemo(() => {
    const out: LoviData = {};
    for (const slot of lovi.slots) {
      const v = (values[slot.key] ?? "").trim();
      switch (slot.type) {
        case "names": {
          const from = (values[`${slot.key}:from`] ?? "").trim();
          const to = (values[`${slot.key}:to`] ?? "").trim();
          out[slot.key] = from || to ? { from, to } : v || "";
          break;
        }
        case "photos[]":
        case "poem_lines[]":
        case "memories[]":
          out[slot.key] = lines(v);
          break;
        default:
          out[slot.key] = v;
      }
    }
    return out;
  }, [values, lovi.slots]);

  const missingRequired = lovi.slots.filter((s) => {
    if (!s.required) return false;
    const d = data[s.key];
    if (Array.isArray(d)) return d.length === 0;
    if (typeof d === "object" && d !== null)
      return !Object.values(d).some((x) => String(x ?? "").trim());
    return !String(d ?? "").trim();
  });

  const toggleLike = async () => {
    const prev = liked;
    setLiked(!prev);
    setLikesCount((c) => c + (prev ? -1 : 1));
    try {
      const res = await fetch(`/api/lovis/${lovi.id}/like`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error");
      setLiked(body.liked);
      setLikesCount(body.likes_count);
    } catch {
      setLiked(prev);
      setLikesCount((c) => c + (prev ? 1 : -1));
    }
  };

  const share = async () => {
    if (sharing) return;
    if (missingRequired.length > 0) {
      setError(
        `Completa los datos obligatorios: ${missingRequired.map((s) => s.label).join(", ")}.`,
      );
      return;
    }
    setSharing(true);
    setError(null);
    try {
      const res = await fetch(`/api/lovis/${lovi.id}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dedicationData: data }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (body.error === "insufficient_roses") {
          throw new Error(
            `No tienes suficientes rosas (usar cuesta ${ROSE_COSTS.lovi_use}).`,
          );
        }
        throw new Error(body.error ?? "No se pudo crear la dedicatoria.");
      }
      setShareUrl(body.shareUrl as string);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la dedicatoria.");
    } finally {
      setSharing(false);
    }
  };

  const absoluteShareUrl = shareUrl
    ? `${window.location.origin}${shareUrl}`
    : null;

  const copyLink = async () => {
    if (!absoluteShareUrl) return;
    try {
      await navigator.clipboard.writeText(absoluteShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No se pudo copiar. Copia el link manualmente.");
    }
  };

  const renderField = (slot: LoviSlot) => {
    const id = `slot-${slot.key}`;
    switch (slot.type) {
      case "names":
        return (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-from`}>De</Label>
              <Input
                id={`${id}-from`}
                value={values[`${slot.key}:from`] ?? ""}
                onChange={(e) => set(`${slot.key}:from`, e.target.value)}
                placeholder="Tu nombre"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-to`}>Para</Label>
              <Input
                id={`${id}-to`}
                value={values[`${slot.key}:to`] ?? ""}
                onChange={(e) => set(`${slot.key}:to`, e.target.value)}
                placeholder="Su nombre"
                className="min-h-[44px]"
              />
            </div>
          </div>
        );
      case "poem_lines[]":
      case "memories[]":
        return (
          <textarea
            id={id}
            value={values[slot.key] ?? ""}
            onChange={(e) => set(slot.key, e.target.value)}
            placeholder={
              slot.type === "memories[]"
                ? "Un recuerdo por línea…"
                : "Un verso por línea…"
            }
            rows={4}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-rose-600"
          />
        );
      case "photos[]":
        return (
          <textarea
            id={id}
            value={values[slot.key] ?? ""}
            onChange={(e) => set(slot.key, e.target.value)}
            placeholder="Una URL de foto por línea…"
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-rose-600"
          />
        );
      case "date":
        return (
          <Input
            id={id}
            type="date"
            value={values[slot.key] ?? ""}
            onChange={(e) => set(slot.key, e.target.value)}
            className="min-h-[44px]"
          />
        );
      default:
        return (
          <Input
            id={id}
            value={values[slot.key] ?? ""}
            onChange={(e) => set(slot.key, e.target.value)}
            placeholder={slot.label}
            className="min-h-[44px]"
          />
        );
    }
  };

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" className="min-h-[44px] -ml-2">
        <Link href="/lovis">
          <ArrowLeft className="mr-1 h-4 w-4" /> Galería
        </Link>
      </Button>

      {shareUrl && absoluteShareUrl ? (
        <Card className="border-rose-200">
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-pink-100">
              <Check className={`h-6 w-6 ${ICON_ROSE}`} />
            </div>
            <h1 className="text-xl font-bold">¡Tu detalle está listo!</h1>
            <p className="text-sm text-muted-foreground">
              Compártelo por WhatsApp con esa persona especial.
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-muted p-2 pl-3">
              <span className="flex-1 truncate text-left text-sm">
                {absoluteShareUrl}
              </span>
              <Button
                size="sm"
                onClick={copyLink}
                className={`min-h-[44px] ${BTN_PRIMARY}`}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="ml-1">{copied ? "Copiado" : "Copiar link"}</span>
              </Button>
            </div>
            <Button asChild className="min-h-[48px] w-full bg-[#25D366] hover:bg-[#25D366]/90">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Te hice un detalle 💌 ${absoluteShareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Send className="mr-2 h-4 w-4" /> Compartir por WhatsApp
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold">{lovi.name}</h1>
            {lovi.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {lovi.description}
              </p>
            )}
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Flame className={`h-3.5 w-3.5 ${ICON_ROSE}`} />
                {lovi.uses_count} usos
              </span>
              <button
                onClick={toggleLike}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 transition-all ${liked ? "bg-gradient-to-r from-red-600 to-pink-500 text-white shadow-md shadow-pink-500/25" : "hover:text-rose-600"}`}
                aria-label={liked ? "Quitar me gusta" : "Me gusta"}
                aria-pressed={liked}
              >
                <Heart
                  className={`h-3.5 w-3.5 ${liked ? "fill-white text-white" : ""}`}
                />
                {likesCount}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="h-[60vh] min-h-[420px] overflow-hidden rounded-2xl border">
            <LoviRenderer code={lovi.code} data={data} title={lovi.name} />
          </div>

          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="font-bold">Personaliza tu detalle</h2>
              {lovi.slots.map((slot) => (
                <div key={slot.key} className="space-y-1.5">
                  <Label htmlFor={`slot-${slot.key}`}>
                    {slot.label}
                    {slot.required && (
                      <span className="text-rose-600"> *</span>
                    )}
                  </Label>
                  {renderField(slot)}
                </div>
              ))}
              <Button
                onClick={share}
                disabled={sharing}
                className={`min-h-[48px] w-full text-base ${BTN_PRIMARY}`}
              >
                {sharing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando tu
                    detalle…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Crear dedicatoria y
                    compartir ·{" "}
                    <span className={`font-semibold ${TEXT_GRADIENT}`}>
                      {ROSE_COSTS.lovi_use} rosas
                    </span>
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
