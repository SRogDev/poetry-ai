import { Card, CardContent } from "@/components/ui/card";

export default function ChatPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-4xl">💬</div>
          <h1 className="mt-4 text-2xl font-bold">Chat emocional</h1>
          <p className="mt-2 text-muted-foreground">
            Aquí describirás qué quieres provocar —{" "}
            <em>“quiero que llore de felicidad”</em> — y el Emotion Engine hará
            el resto.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Próximamente en Fase 1.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
