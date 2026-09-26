import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    emoji: "🎙️",
    title: "Videos de poema dedicados",
    text: "Poema + voz que lo recita + tus fotos + música. El formato que LatAm ya ama, sin editar nada.",
  },
  {
    emoji: "📦",
    title: "Lovis interactivos",
    text: "Cubo 3D de fotos, cajita de sorpresas, frasco de razones… El link que compartes ES el regalo.",
  },
  {
    emoji: "✨",
    title: "Crea tus propios Lovis",
    text: "Describe el detalle que imaginas en el chat y la IA lo construye. Compártelo con toda la comunidad.",
  },
  {
    emoji: "💌",
    title: "Cartas que se sienten reales",
    text: "El Emotion Engine calibra cada palabra a la psicología de esa persona: sus recuerdos, su humor, su forma de amar.",
  },
  {
    emoji: "🌹",
    title: "Rosas, no suscripciones raras",
    text: "Cada detalle cuesta unas rosas. Recarga cuando quieras o suscríbete para tener siempre.",
  },
  {
    emoji: "📲",
    title: "Nacido para WhatsApp",
    text: "Todo se comparte en un toque: estados, chats, TikTok, Reels. El detalle digital ES el detalle.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-rose-50 dark:from-rose-950/20 dark:via-background dark:to-rose-950/20">
      {/* Nav */}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <Image
            src="/icons/icon-192.png"
            alt="Poetry AI"
            width={36}
            height={36}
            className="rounded-xl"
          />
          <span className="text-xl font-bold tracking-tight">
            Poetry <span className="text-rose-600">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login">
            <Button variant="ghost">Entrar</Button>
          </Link>
          <Link href="/auth/sign-up">
            <Button className="bg-rose-600 hover:bg-rose-700">
              Crear cuenta
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-10 text-center md:pt-20">
        <Image
          src="/icons/icon-192.png"
          alt="Rosa de Poetry AI"
          width={96}
          height={96}
          className="mx-auto mb-6 rounded-3xl shadow-lg shadow-rose-200"
        />
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl">
          Lovis — <span className="text-rose-600">detalles que se sienten</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
          Dile a la IA qué quieres provocar —{" "}
          <em>“quiero que llore de felicidad”</em> — y crea poemas, cartas y
          videos dedicados con la emoción exacta. Para tu pareja, tu mamá, tu
          abuela, tu mejor amigo.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/auth/sign-up">
            <Button size="lg" className="bg-rose-600 px-8 hover:bg-rose-700">
              🌹 Crear mi primer detalle gratis
            </Button>
          </Link>
          <Link href="#formatos">
            <Button size="lg" variant="outline">
              Ver los formatos
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Solo LatAm · Solo español · Empiezas con 10 rosas gratis
        </p>
      </section>

      {/* Features */}
      <section id="formatos" className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="border-rose-100">
              <CardContent className="pt-6">
                <div className="text-3xl">{f.emoji}</div>
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-24 text-center">
        <Card className="border-rose-200 bg-rose-50 dark:bg-rose-950/30">
          <CardContent className="py-12">
            <h2 className="text-2xl font-bold md:text-3xl">
              El detalle perfecto existe.
              <br />
              Solo hay que crearlo para <em>esa</em> persona.
            </h2>
            <Link href="/auth/sign-up" className="mt-6 inline-block">
              <Button size="lg" className="bg-rose-600 px-8 hover:bg-rose-700">
                Empezar gratis 🌹
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Poetry AI · Hecho con 🌹 en LatAm ·{" "}
        <a
          href="https://github.com/SRogDev/poetry-ai"
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          Open source (MIT)
        </a>
      </footer>
    </main>
  );
}
