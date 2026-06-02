/** Final hook formatting — dedupe emotion labels and normalize quotes. */

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function removeDuplicateEmotionPrefix(hook: string, emotion: string): string {
  const label = emotion.trim()
  if (!label) return hook

  const regex = new RegExp(
    `^${escapeRegExp(label)}\\.?\\s+${escapeRegExp(label)}\\.?\\s*`,
    'i'
  )

  return hook.replace(regex, `${label}. `)
}

/** Dedupe repeated "Word. Word." opener when emotion string is unknown. */
export function dedupeRepeatedLabelPrefix(hook: string): string {
  return hook.replace(/^([A-Za-z][A-Za-z\s'-]{0,40}?)\.\s+\1\.\s*/i, (_, label: string) => {
    const trimmed = label.trim()
    return trimmed ? `${trimmed}. ` : ''
  })
}

export function hookStartsWithEmotionalLabel(hook: string, emotion: string): boolean {
  const label = emotion.trim()
  if (!label) return false
  return new RegExp(`^${escapeRegExp(label)}\\.?\\s`, 'i').test(hook.trim())
}

export function formatFinalHook(
  hook: string,
  options?: { emotion?: string }
): string {
  let text = hook.replace(/^["']|["']$/g, '').trim()
  if (!text) return text

  const emotion = options?.emotion?.trim()
  if (emotion) {
    text = removeDuplicateEmotionPrefix(text, emotion)
  }
  text = dedupeRepeatedLabelPrefix(text)
  return text
}
