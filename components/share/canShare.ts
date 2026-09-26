// Native Web Share capability check (testable, no DOM side effects).

/**
 * True when the browser can natively share the given file
 * (navigator.canShare with a File). Safe to call during SSR.
 */
export function canNativeShare(
  file: File | Blob | null | undefined,
  nav?: Navigator,
): boolean {
  if (!file) return false;
  const n =
    nav ?? (typeof navigator !== "undefined" ? navigator : undefined);
  if (!n || typeof n.canShare !== "function") return false;
  // canShare({files}) requires real File objects, not plain Blobs.
  if (typeof File !== "undefined" && !(file instanceof File)) return false;
  try {
    return n.canShare({ files: [file as File] });
  } catch {
    return false;
  }
}
