"use client";

// Community Lovi gallery: search, cards, likes. Client component —
// data comes from GET /api/lovis.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Flame, Heart, Loader2, Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BTN_PRIMARY, ICON_ROSE, PILL_ACTIVE } from "@/components/lovis/brand";
import type { LoviSlot } from "@/lib/lovis/slots";

export interface GalleryLovi {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  uses_count: number;
  likes_count: number;
  slots: LoviSlot[];
  liked?: boolean;
}

export function LovisGallery() {
  const [lovis, setLovis] = useState<GalleryLovi[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/lovis${query ? `?q=${encodeURIComponent(query)}` : ""}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cargar");
      setLovis(data.lovis ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar la galería.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  const onSearch = (value: string) => {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => load(value.trim()), 350);
  };

  const toggleLike = async (lovi: GalleryLovi) => {
    // Optimistic update.
    setLovis((prev) =>
      prev.map((l) =>
        l.id === lovi.id
          ? {
              ...l,
              liked: !l.liked,
              likes_count: l.likes_count + (l.liked ? -1 : 1),
            }
          : l,
      ),
    );
    try {
      const res = await fetch(`/api/lovis/${lovi.id}/like`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setLovis((prev) =>
        prev.map((l) =>
          l.id === lovi.id
            ? { ...l, liked: data.liked, likes_count: data.likes_count }
            : l,
        ),
      );
    } catch {
      // Roll back on failure (re-fetch keeps it simple and correct).
      load(q.trim());
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar detalles… (cubo 3D, frasco, serenata)"
            className="min-h-[44px] pl-10"
            aria-label="Buscar Lovis"
          />
        </div>
        <Button asChild className={`min-h-[44px] shrink-0 ${BTN_PRIMARY}`}>
          <Link href="/lovis/studio">
            <Plus className="mr-1 h-4 w-4" /> Crear
          </Link>
        </Button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className={`h-8 w-8 animate-spin ${ICON_ROSE}`} />
        </div>
      ) : lovis.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className={`mx-auto h-10 w-10 ${ICON_ROSE}`} />
            <h2 className="mt-4 text-lg font-bold">
              {q ? "Nada por aquí…" : "Sé la primera persona en crear un detalle"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {q
                ? "Prueba con otra búsqueda o crea tu propio Lovi."
                : "Describe tu idea y la IA genera un detalle interactivo que toda la comunidad puede usar."}
            </p>
            <Button asChild className={`mt-6 min-h-[44px] ${BTN_PRIMARY}`}>
              <Link href="/lovis/studio">
                <Plus className="mr-1 h-4 w-4" /> Crear mi Lovi
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {lovis.map((lovi) => (
            <Card key={lovi.id} className="overflow-hidden">
              <CardContent className="p-5">
                <h2 className="font-bold leading-tight">{lovi.name}</h2>
                {lovi.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {lovi.description}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Flame className={`h-3.5 w-3.5 ${ICON_ROSE}`} />
                    {lovi.uses_count} usos
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Heart
                      className={`h-3.5 w-3.5 ${lovi.liked ? "fill-rose-500 text-rose-600" : ""}`}
                    />
                    {lovi.likes_count}
                  </span>
                  <span className="ml-auto">{lovi.slots.length} datos</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button asChild className={`min-h-[44px] flex-1 ${BTN_PRIMARY}`}>
                    <Link href={`/lovis/${lovi.id}`}>Usar este detalle</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className={`min-h-[44px] min-w-[44px] ${lovi.liked ? PILL_ACTIVE : ""}`}
                    onClick={() => toggleLike(lovi)}
                    aria-label={lovi.liked ? "Quitar me gusta" : "Me gusta"}
                    aria-pressed={lovi.liked}
                  >
                    <Heart
                      className={`h-4 w-4 ${lovi.liked ? "fill-white text-white" : ""}`}
                    />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
