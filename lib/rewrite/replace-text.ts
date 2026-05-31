/** Replace the first occurrence of `original` inside `text`. Falls back to append if not found. */
export function replaceSelectionInText(
  text: string,
  original: string,
  replacement: string
): string {
  if (!text) return replacement
  const idx = text.indexOf(original)
  if (idx < 0) return `${text}\n\n${replacement}`.trim()
  return text.slice(0, idx) + replacement + text.slice(idx + original.length)
}
