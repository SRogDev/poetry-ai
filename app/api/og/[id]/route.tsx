// GET /api/og/[id] — dynamic Open Graph image for a share link (1200x630).
// Flat colors + system fonts: tiny PNG, fast, well under 300KB.
import { ImageResponse } from "next/og";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const FORMAT_LABEL: Record<string, string> = {
  poem: "un poema",
  letter: "una carta",
  quote: "una frase",
  video: "un video",
  slideshow: "un slideshow",
  song: "una canción",
  lovi: "un detalle interactivo",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const supabase = createServiceRoleClient();
    const { data: link } = await supabase
      .from("share_links")
      .select("dedication_id")
      .eq("id", id)
      .single();
    let format = "poem";
    if (link) {
      const { data: d } = await supabase
        .from("dedications")
        .select("format")
        .eq("id", link.dedication_id)
        .single();
      if (d?.format) format = d.format;
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "linear-gradient(135deg, #DC2626 0%, #EC4899 100%)",
            color: "#fff",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            padding: 80,
          }}
        >
          <div style={{ fontSize: 44, opacity: 0.85, marginBottom: 24 }}>
            Te dedicaron {FORMAT_LABEL[format] ?? "algo especial"}
          </div>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.1 }}>
            Ábrelo. Siéntelo.
          </div>
          <div
            style={{
              marginTop: 40,
              fontSize: 32,
              color: "rgba(255,255,255,0.9)",
              fontWeight: 600,
            }}
          >
            Hecho con Poetry AI
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  } catch {
    return new Response("og_error", { status: 500 });
  }
}
