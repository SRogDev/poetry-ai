// Pure text-wrapping for the letter card (canvas + DOM share it).

/**
 * Wrap text into lines that fit maxWidth (px), keeping explicit newlines
 * as paragraph breaks and splitting words longer than maxWidth.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph === "") {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      const trial = current ? `${current} ${word}` : word;
      if (measure(trial) <= maxWidth) {
        current = trial;
        continue;
      }
      if (current) lines.push(current);
      if (measure(word) > maxWidth) {
        // break the overlong word char by char
        let chunk = "";
        for (const ch of word) {
          if (measure(chunk + ch) <= maxWidth) {
            chunk += ch;
          } else {
            lines.push(chunk);
            chunk = ch;
          }
        }
        current = chunk;
      } else {
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}
