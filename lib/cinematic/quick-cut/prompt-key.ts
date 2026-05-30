/** Normalize prompts for topic-change comparison (notes/keywords order may differ). */
export function normalizeQuickCutPromptKey(prompt: string): string {
  return prompt.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function quickCutTopicChanged(previous: string, next: string): boolean {
  const a = normalizeQuickCutPromptKey(previous)
  const b = normalizeQuickCutPromptKey(next)
  if (!a || !b) return false
  return a !== b
}
