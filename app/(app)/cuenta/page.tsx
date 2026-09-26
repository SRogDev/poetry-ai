"use client";

import { useEffect, useState } from "react";
import { Clock3, Loader2, Flower2, Sparkles } from "lucide-react";

interface HistoryEntry {
  delta: number;
  reason: string;
  created_at: string;
}

const REASON_LABELS: Record<string, string> = {
  signup_bonus: "Bono de bienvenida",
  monthly_grant: "Recarga mensual gratis",
  poem: "Poema creado",
  letter: "Carta de amor creada",
  quote: "Frase creada",
  slideshow: "Slideshow creado",
  video: "Video narrado creado",
  song: "Canción IA creada",
  lovi_create: "Lovi creado",
  lovi_use: "Lovi usado",
};

function reasonLabel(reason: string) {
  return (
    REASON_LABELS[reason] ??
    reason.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("es", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function CuentaPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bRes, hRes] = await Promise.all([
          fetch("/api/roses/balance", { cache: "no-store" }),
          fetch("/api/roses/history", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (!bRes.ok) throw new Error("balance");
        const b = (await bRes.json()) as { balance: number };
        setBalance(typeof b.balance === "number" ? b.balance : 0);
        if (hRes.ok) {
          const h = (await hRes.json()) as { entries: HistoryEntry[] };
          setEntries(Array.isArray(h.entries) ? h.entries : []);
        }
      } catch {
        if (!cancelled)
          setError(
            "No pudimos cargar tu cuenta. Revisa tu conexión e inténtalo de nuevo.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi cuenta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tus rosas son la moneda de los detalles.
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

      {/* Saldo */}
      <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
        {loading ? (
          <Loader2
            className="mx-auto size-8 animate-spin text-pink-500"
            aria-hidden
          />
        ) : (
          <>
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-950">
              <Flower2 className="size-8 text-pink-500" aria-hidden />
            </div>
            <p className="mt-3 text-5xl font-bold tracking-tight">
              {balance ?? 0}
            </p>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {balance === 1 ? "rosa disponible" : "rosas disponibles"}
            </p>
            <p className="mx-auto mt-3 max-w-xs text-xs text-muted-foreground">
              Cada mes recibes 20 rosas gratis. Poemas desde 1, videos desde 10,
              canciones desde 15.
            </p>
          </>
        )}
      </div>

      {/* Historial */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Movimientos
        </h2>
        {loading ? (
          <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
            Cargando movimientos…
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border bg-card p-6 text-center">
            <Clock3
              className="mx-auto size-8 text-muted-foreground/50"
              aria-hidden
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Todavía no hay movimientos. Crea tu primer detalle y aparecerá
              aquí.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border bg-card">
            {entries.map((e, i) => (
              <li
                key={`${e.created_at}-${i}`}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span
                  className={`inline-flex min-w-[52px] items-center justify-center rounded-full px-2 py-1 text-xs font-bold ${
                    e.delta >= 0
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300"
                  }`}
                >
                  {e.delta >= 0 ? `+${e.delta}` : e.delta}
                </span>
                <span className="flex-1 truncate text-sm font-medium">
                  {reasonLabel(e.reason)}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(e.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Facturación */}
      <div className="rounded-2xl border border-dashed border-pink-300 bg-pink-50/50 p-6 text-center dark:border-pink-900 dark:bg-pink-950/30">
        <Sparkles className="mx-auto size-8 text-pink-500" aria-hidden />
        <h2 className="mt-2 text-base font-bold">Suscripciones próximamente</h2>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
          Estamos preparando planes con más rosas y funciones exclusivas. Por
          ahora, tus rosas se recargan gratis cada mes. Sin tarjeta, sin
          sorpresas.
        </p>
      </div>
    </div>
  );
}
