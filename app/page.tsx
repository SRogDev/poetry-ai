// Landing — Poetry AI. Brand: red → pink gradient (rose theme).
import Link from "next/link";
import {
  Box,
  Clapperboard,
  Heart,
  Mail,
  Music,
  Quote,
  Flower2,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const GRADIENT_BTN =
  "bg-gradient-to-r from-red-600 to-pink-500 text-white shadow-lg shadow-pink-500/25 hover:opacity-95 active:scale-[0.98]";
const GRADIENT_TEXT =
  "bg-gradient-to-r from-red-600 to-pink-500 bg-clip-text text-transparent";

const FORMATS = [
  { icon: Clapperboard, name: "Video narrado", cost: "10 🌹", desc: "Poema + voz + fotos + música" },
  { icon: Mail, name: "Carta de amor", cost: "2 🌹", desc: "Carta + tarjeta PNG para compartir" },
  { icon: Heart, name: "Poema", cost: "1 🌹", desc: "El clásico que nunca falla" },
  { icon: Quote, name: "Frase", cost: "2 🌹", desc: "Frase cinética para estados" },
  { icon: Music, name: "Canción IA", cost: "15 🌹", desc: "Tema musical dedicado" },
  { icon: Box, name: "Lovi", cost: "5 🌹", desc: "Detalle interactivo de la comunidad" },
];

const STEPS = [
  {
    icon: Send,
    title: "Cuéntanos qué quieres provocar",
    text: "“Quiero que llore de felicidad”, “quiero perdonar a mi papá”. El brief es una emoción, no un pedido.",
  },
  {
    icon: Wand2,
    title: "El Emotion Engine lo calibra",
    text: "Extrae la intención, suma lo que sabe de esa persona y genera hasta que el crítico emocional aprueba.",
  },
  {
    icon: Sparkles,
    title: "Compártelo en un toque",
    text: "Video, carta, Lovi… el link ES el regalo. Directo a WhatsApp, estados, TikTok.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-pink-500 shadow-md shadow-pink-500/30">
            <Flower2 className="h-5 w-5 text-white" aria-hidden />
          </span>
          <span className="text-xl font-bold tracking-tight">
            Poetry <span className={GRADIENT_TEXT}>AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login">
            <Button variant="ghost">Entrar</Button>
          </Link>
          <Link href="/auth/sign-up">
            <Button className={GRADIENT_BTN}>Crear cuenta</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-50 via-pink-50 to-white"
          aria-hidden
        />
        <div className="relative mx-auto max-w-5xl px-6 pb-16 pt-12 text-center md:pt-20">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/70 px-4 py-1.5 text-sm font-medium text-pink-700 backdrop-blur">
            <Heart className="h-4 w-4 fill-pink-500 text-pink-500" aria-hidden />
            Lovis — detalles que se sienten
          </p>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl">
            Dile a la IA qué quieres <span className={GRADIENT_TEXT}>provocar</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-600 md:text-xl">
            <em>“Quiero que llore de felicidad.”</em> Crea poemas, cartas,
            videos y detalles interactivos dedicados con la emoción exacta —
            para tu pareja, tu mamá, tu abuela, tu mejor amigo.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/auth/sign-up">
              <Button size="lg" className={`${GRADIENT_BTN} px-8 text-base`}>
                <Flower2 className="mr-2 h-5 w-5" aria-hidden />
                Crear mi primer detalle gratis
              </Button>
            </Link>
            <Link href="#formatos">
              <Button size="lg" variant="outline" className="border-pink-200">
                Ver los formatos
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-stone-500">
            Solo LatAm · Solo español · Empiezas con 10 rosas gratis
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold md:text-3xl">
          Así funciona la <span className={GRADIENT_TEXT}>magia</span>
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Card key={s.title} className="border-pink-100">
              <CardContent className="pt-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-pink-500 text-white shadow-md shadow-pink-500/25">
                  <s.icon className="h-5 w-5" aria-hidden />
                </span>
                <p className="mt-4 text-xs font-bold tracking-widest text-pink-600">
                  PASO {i + 1}
                </p>
                <h3 className="mt-1 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-stone-600">{s.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Formats */}
      <section id="formatos" className="bg-gradient-to-b from-white to-pink-50/60">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-center text-2xl font-bold md:text-3xl">
            Un formato para cada <span className={GRADIENT_TEXT}>emoción</span>
          </h2>
          <p className="mt-3 text-center text-stone-600">
            Pagas con rosas, no con suscripciones raras. 20 rosas gratis cada mes.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FORMATS.map((f) => (
              <Card key={f.name} className="border-pink-100">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-100 text-pink-700">
                      <f.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="rounded-full bg-gradient-to-r from-red-600 to-pink-500 px-3 py-1 text-xs font-bold text-white">
                      {f.cost}
                    </span>
                  </div>
                  <h3 className="mt-4 font-semibold">{f.name}</h3>
                  <p className="mt-1 text-sm text-stone-600">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-rose-500 to-pink-500 px-8 py-14 text-center text-white shadow-xl shadow-pink-500/30">
          <h2 className="mx-auto max-w-2xl text-2xl font-bold md:text-4xl">
            El detalle perfecto existe.
            <br />
            Solo hay que crearlo para <em>esa</em> persona.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/85">
            Únete gratis y crea tu primera dedicatoria en menos de un minuto.
          </p>
          <Link href="/auth/sign-up" className="mt-8 inline-block">
            <Button
              size="lg"
              className="bg-white px-8 text-base font-bold text-pink-700 shadow-lg hover:bg-pink-50 active:scale-[0.98]"
            >
              Empezar gratis
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-pink-100 py-8 text-center text-sm text-stone-500">
        <p className="flex items-center justify-center gap-1.5">
          Poetry AI · Hecho con
          <Flower2 className="h-4 w-4 text-pink-500" aria-hidden />
          en LatAm
        </p>
        <a
          href="https://github.com/SRogDev/poetry-ai"
          className="mt-2 inline-block underline"
          target="_blank"
          rel="noreferrer"
        >
          Open source (MIT)
        </a>
      </footer>
    </main>
  );
}
