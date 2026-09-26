"use client";

// Sandboxed renderer for Lovi artifacts.
// The iframe sandbox blocks embedded code from touching the parent page or
// the user's session; allow-scripts is required because Lovis ARE interactive
// (tap to open, scratch to reveal, spin the cube...).

import { buildLoviHtml, type LoviData } from "@/lib/lovis/slots";

interface LoviRendererProps {
  code: string;
  data: LoviData;
  title?: string;
}

export function LoviRenderer({ code, data, title = "Lovi" }: LoviRendererProps) {
  const html = buildLoviHtml(code, data);
  return (
    <iframe
      title={title}
      srcDoc={html}
      sandbox="allow-scripts"
      className="h-full w-full rounded-2xl border-0"
    />
  );
}
