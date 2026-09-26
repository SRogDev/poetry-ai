"use client";

// Manual canvas render of the letter card: 1080x1350 PNG.

import { wrapText } from "./letterText";

const W = 1080;
const H = 1350;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderLetterPNG(opts: {
  letter: string;
  recipientName: string;
  fromName?: string;
}): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el lienzo.");

  // Paper background: warm cream gradient + soft vignette.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#FFFBF7");
  bg.addColorStop(1, "#FBEFE3");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const vignette = ctx.createRadialGradient(
    W / 2,
    H / 2,
    H * 0.35,
    W / 2,
    H / 2,
    H * 0.75,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(120,60,40,0.08)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // Rose accent bar at the top (brand gradient red -> pink).
  const bar = ctx.createLinearGradient(90, 0, 210, 0);
  bar.addColorStop(0, "#DC2626");
  bar.addColorStop(1, "#EC4899");
  ctx.fillStyle = bar;
  roundRect(ctx, 90, 64, 120, 10, 5);
  ctx.fill();

  // Header: "Para {name}".
  ctx.fillStyle = "#9D174D";
  ctx.font = `600 40px "Space Grotesk", system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Para", 90, 170);
  ctx.fillStyle = "#18181B";
  ctx.font = `700 64px "Space Grotesk", system-ui, sans-serif`;
  ctx.fillText(opts.recipientName, 90, 244);

  // Divider.
  ctx.strokeStyle = "#F9A8D4";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(90, 292);
  ctx.lineTo(W - 90, 292);
  ctx.stroke();

  // Body: shrink-to-fit serif text.
  const maxTextWidth = W - 180;
  const bodyTop = 380;
  const bodyBottom = H - 260;
  let fontSize = 42;
  let lines: string[] = [];
  while (fontSize >= 28) {
    ctx.font = `400 ${fontSize}px Georgia, "Times New Roman", serif`;
    lines = wrapText(opts.letter, maxTextWidth, (s) => ctx.measureText(s).width);
    const lineH = fontSize * 1.65;
    if (lines.length * lineH <= bodyBottom - bodyTop) break;
    fontSize -= 4;
  }
  const lineH = fontSize * 1.65;
  ctx.fillStyle = "#292524";
  ctx.textAlign = "left";
  let y = bodyTop + lineH * 0.8;
  for (const line of lines) {
    ctx.fillText(line, 90, y);
    y += lineH;
  }

  // Signature.
  const signature = opts.fromName ? `— ${opts.fromName}` : "— Con amor";
  ctx.font = `italic 600 ${Math.round(fontSize * 0.95)}px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = "#9D174D";
  ctx.textAlign = "right";
  ctx.fillText(signature, W - 90, H - 170);

  // Footer watermark.
  ctx.font = `500 28px "Space Grotesk", system-ui, sans-serif`;
  ctx.fillStyle = "rgba(120,113,108,0.9)";
  ctx.textAlign = "center";
  ctx.fillText("Hecho con Poetry AI", W / 2, H - 70);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("No se pudo generar la imagen PNG.");
  return blob;
}
