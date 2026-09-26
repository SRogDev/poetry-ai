import { Suspense } from "react";
import { connection } from "next/server";
import { Card, CardContent } from "@/components/ui/card";

// Public dedication page: /s/[id]. The share link IS the gift.
// Phase 2: the inner component fetches the share_links row + dedication and
// renders the Lovi/video/letter with SSR Open Graph metadata for WhatsApp.

interface SharePageProps {
  params: Promise<{ id: string }>;
}

async function ShareContent({ params }: SharePageProps) {
  // Per-dedication dynamic content: never prerendered.
  await connection();
  const { id } = await params;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="text-5xl">🌹</div>
      <h1 className="mt-6 text-2xl font-bold">Te dedicaron algo especial</h1>
      <Card className="mt-6 w-full">
        <CardContent className="py-10">
          <p className="text-muted-foreground">
            Dedicatoria <code className="text-sm">{id}</code>
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Las páginas públicas de dedicatorias llegan en Fase 2: aquí vivirá
            el detalle interactivo, con previsualización optimizada para
            WhatsApp.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

export default function SharePage({ params }: SharePageProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
          <div className="text-5xl">🌹</div>
          <p className="mt-4 text-muted-foreground">Abriendo tu detalle…</p>
        </main>
      }
    >
      <ShareContent params={params} />
    </Suspense>
  );
}
