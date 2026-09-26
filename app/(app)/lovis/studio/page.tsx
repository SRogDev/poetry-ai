import { LoviStudio } from "@/components/lovis/LoviStudio";

export const metadata = {
  title: "Crear Lovi — Poetry AI",
  description:
    "Describe tu idea y la IA genera un detalle interactivo para compartir.",
};

export default function LoviStudioPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-6">
      <LoviStudio />
    </main>
  );
}
