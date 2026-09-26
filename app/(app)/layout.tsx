"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Space_Grotesk } from "next/font/google";
import {
  Gift,
  HeartHandshake,
  Flower2,
  Sparkles,
  UserRound,
} from "lucide-react";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const NAV = [
  { href: "/chat", label: "Crear", Icon: Sparkles },
  { href: "/lovis", label: "Lovis", Icon: Gift },
  { href: "/recipients", label: "Personas", Icon: HeartHandshake },
  { href: "/cuenta", label: "Cuenta", Icon: UserRound },
] as const;

function RosesChip() {
  const [balance, setBalance] = useState<number | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/roses/balance", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { balance: number };
        setBalance(typeof data.balance === "number" ? data.balance : 0);
      }
    } catch {
      // No bloqueamos la app si el saldo no carga.
    }
  };

  useEffect(() => {
    load();
    const onChanged = () => load();
    window.addEventListener("poetry:roses-changed", onChanged);
    return () => window.removeEventListener("poetry:roses-changed", onChanged);
  }, []);

  return (
    <Link
      href="/cuenta"
      aria-label="Mis rosas"
      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-pink-200 bg-pink-50 px-3 py-1.5 text-sm font-semibold text-pink-700 transition-colors duration-200 hover:bg-pink-100 dark:border-pink-900 dark:bg-pink-950 dark:text-pink-300 dark:hover:bg-pink-900"
    >
      <Flower2 className="size-4" aria-hidden />
      <span>{balance === null ? "…" : balance}</span>
    </Link>
  );
}

function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto grid w-full max-w-2xl grid-cols-4">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-200 ${
                active
                  ? "text-pink-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className={`flex min-h-[36px] items-center rounded-full px-4 ${
                  active
                    ? "bg-gradient-to-r from-red-600 to-pink-500 text-white shadow-md shadow-pink-500/30"
                    : ""
                }`}
              >
                <Icon className="size-6" aria-hidden />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`${spaceGrotesk.className} flex min-h-dvh flex-col bg-background text-foreground`}
    >
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
          <Link
            href="/chat"
            className="text-lg font-bold tracking-tight"
            aria-label="Poetry AI — inicio"
          >
            Poetry
            <span className="bg-gradient-to-r from-red-600 to-pink-500 bg-clip-text text-transparent">
              AI
            </span>
          </Link>
          <RosesChip />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-32 pt-5">
        {children}
      </main>

      <Suspense fallback={<div className="h-[64px]" aria-hidden />}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
