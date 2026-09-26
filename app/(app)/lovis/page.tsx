import { LovisGallery } from "@/components/lovis/LovisGallery";
import { TEXT_GRADIENT } from "@/components/lovis/brand";

export const metadata = {
  title: "Lovis — detalles que se sienten",
  description:
    "La galería comunitaria de detalles interactivos: crea los tuyos con IA, úsalos y compártelos por WhatsApp.",
};

export default function LovisPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">
          Lovis{" "}
          <span className={TEXT_GRADIENT}>— detalles que se sienten</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Detalles interactivos creados por la comunidad. Elige uno, llénalo
          con tus datos y compártelo por WhatsApp.
        </p>
      </div>
      <LovisGallery />
    </main>
  );
}
