import { Card, CardContent } from "@/components/ui/card";

export default function LovisPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-4xl">📦</div>
          <h1 className="mt-4 text-2xl font-bold">
            Lovis — <span className="text-rose-600">detalles que se sienten</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            La galería comunitaria de detalles interactivos: cubo 3D de fotos,
            cajita de sorpresas, frasco de razones… y los que la comunidad
            cree. Úsalos, remixéalos, crea los tuyos.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Galería + estudio de creación próximamente en Fase 2.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
