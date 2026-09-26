// Prompt loader — prompt text lives in sibling *.md files (server-only).
// These modules must never be imported from client components.
//
// NOTE: resolved from process.cwd() (the project root), NOT __dirname:
// Next.js bundles server code into .next/server/..., so __dirname no longer
// points at the source tree at runtime. This works in dev, build, and
// `next start` as long as the server starts from the project root.

import { readFileSync } from "node:fs";
import { join } from "node:path";

export function loadPrompt(name: string): string {
  return readFileSync(
    join(process.cwd(), "lib", "openrouter", "prompts", `${name}.md`),
    "utf-8",
  );
}

/** Replace {{PLACEHOLDER}} tokens with values. */
export function fillTemplate(
  template: string,
  values: Record<string, string>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(values)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}
