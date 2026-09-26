"use client";

// Lovi creator studio: describe the idea → AI generates the artifact →
// live preview with sample data → name it → publish to the gallery.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Rocket,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoviRenderer } from "@/components/lovis/LoviRenderer";
import {
  BTN_PRIMARY,
  ICON_ROSE,
  RING_ROSE,
  TEXT_GRADIENT,
} from "@/components/lovis/brand";
import { ROSE_COSTS } from "@/lib/roses/costs";
import type { LoviData, LoviSlot } from "@/lib/lovis/slots";

interface Generated {
  code: string;
  slots: LoviSlot[];
  previewData: LoviData;
}

export function LoviStudio() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [gen, setGen] = useState<Generated | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!idea.trim() || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/lovis/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: idea.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo generar.");
      setGen(data as Generated);
      if (!name) {
        setName(
          idea.trim().slice(0, 40) + (idea.trim().length > 40 ? "…" : ""),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el detalle.");
    } finally {
      setGenerating(false);
    }
  };

  const publish = async () => {
    if (!gen || publishing) return;
    if (!name.trim()) {
      setError("Ponle un nombre a tu Lovi antes de publicarlo.");
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/lovis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          code: gen.code,
          slots: gen.slots,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "insufficient_roses") {
          throw new Error(
            `No tienes suficientes rosas (publicar cuesta ${ROSE_COSTS.lovi_create}).`,
          );
        }
        throw new Error(data.error ?? "No se pudo publicar.");
      }
      router.push("/lovis");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo publicar el Lovi.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" className="min-h-[44px] -ml-2">
        <Link href="/lovis">
          <ArrowLeft className="mr-1 h-4 w-4" /> Galería
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Estudio Lovi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe el detalle que imaginas y la IA lo convierte en una
          experiencia interactiva. Generar es gratis; publicar cuesta{" "}
          <span className={`font-semibold ${TEXT_GRADIENT}`}>
            {ROSE_COSTS.lovi_create} rosas
          </span>
          .
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <Card>
        <CardContent className="space-y-3 p-5">
          <Label htmlFor="idea">¿Qué detalle quieres crear?</Label>
          <textarea
            id="idea"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Un cielo estrellado donde cada estrella es un recuerdo nuestro…"
            rows={3}
            maxLength={500}
            className={`w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 ${RING_ROSE}`}
          />
          <Button
            onClick={generate}
            disabled={generating || !idea.trim()}
            className={`min-h-[44px] w-full ${BTN_PRIMARY}`}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando tu
                detalle…
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" /> Generar detalle
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {gen && (
        <>
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
              <Sparkles className={`h-5 w-5 ${ICON_ROSE}`} /> Vista previa
            </h2>
            <p className="mb-2 text-xs text-muted-foreground">
              Así se verá con datos de ejemplo. Al usarlo, se llenará con los
              datos reales de tu dedicatoria.
            </p>
            <div className="h-[70vh] min-h-[480px] overflow-hidden rounded-2xl border">
              <LoviRenderer
                code={gen.code}
                data={gen.previewData}
                title="Vista previa del Lovi"
              />
            </div>
          </div>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <Label htmlFor="lovi-name">Nombre del detalle</Label>
                <Input
                  id="lovi-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Frasco de razones"
                  maxLength={80}
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lovi-desc">Descripción</Label>
                <textarea
                  id="lovi-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Cuéntale a la comunidad qué hace tu detalle…"
                  rows={2}
                  maxLength={280}
                  className={`w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 ${RING_ROSE}`}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {gen.slots.map((s) => (
                  <span
                    key={s.key}
                    className="rounded-full bg-pink-100 px-2.5 py-1 text-xs font-medium text-rose-700"
                  >
                    {s.label}
                    {s.required ? " *" : ""}
                  </span>
                ))}
              </div>
              <Button
                onClick={generate}
                variant="outline"
                disabled={generating}
                className="min-h-[44px] w-full"
              >
                <Wand2 className="mr-2 h-4 w-4" /> Regenerar con otra idea
              </Button>
              <Button
                onClick={publish}
                disabled={publishing}
                className={`min-h-[48px] w-full text-base ${BTN_PRIMARY}`}
              >
                {publishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publicando…
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" /> Publicar en la galería ·{" "}
                    {ROSE_COSTS.lovi_create} rosas
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
