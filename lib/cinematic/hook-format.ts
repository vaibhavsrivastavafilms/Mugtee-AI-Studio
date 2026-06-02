/** Final hook formatting — dedupe emotion labels and normalize quotes. */

const HOOK_LABEL_RX = /^\s*\[HOOK\]\s*/i
const SCRIPT_SECTION_RX = /\s*\[(?:BEAT\s*\d+|PAYOFF|CTA)\]/i
const SCREENPLAY_TAG_RX = /\[(?:HOOK|BEAT\s*\d+|PAYOFF|CTA)\]/i

export function looksLikeScreenplay(text: string): boolean {
  return SCREENPLAY_TAG_RX.test(text)
}

/** Parse the opening hook line from a screenplay-formatted script string. */
export function extractHookFromScript(script: string): string {
  const trimmed = script.trim()
  if (!trimmed) return ''

  const blocks = trimmed.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean)
  for (const block of blocks) {
    const match = block.match(/^\[HOOK\]\s*([\s\S]*)$/i)
    if (match) return match[1].trim()
  }

  const firstLine = trimmed.split('\n').find((line) => line.trim())?.trim() ?? ''
  if (/^\[HOOK\]/i.test(firstLine)) {
    return firstLine.replace(HOOK_LABEL_RX, '').trim()
  }

  return stripBeatLabelsForHookDisplay(trimmed)
}

/** Strip screenplay labels and beat sections — hook display should be one line. */
export function stripBeatLabelsForHookDisplay(text: string): string {
  let hook = text.trim()
  if (!hook) return hook

  const sectionIdx = hook.search(SCRIPT_SECTION_RX)
  if (sectionIdx > 0) {
    hook = hook.slice(0, sectionIdx).trim()
  }

  return hook.replace(HOOK_LABEL_RX, '').trim()
}

/** When hook state contains full script labels, keep only the opening hook line. */
export function isolateHookText(text: string): string {
  if (looksLikeScreenplay(text)) {
    const extracted = extractHookFromScript(text)
    if (extracted) return stripBeatLabelsForHookDisplay(extracted)
  }
  return stripBeatLabelsForHookDisplay(text)
}

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
  let text = isolateHookText(hook.replace(/^["']|["']$/g, '').trim())
  if (!text) return text

  const emotion = options?.emotion?.trim()
  if (emotion) {
    text = removeDuplicateEmotionPrefix(text, emotion)
  }
  text = dedupeRepeatedLabelPrefix(text)
  return text
}

/** Prefer title-step hook when script output polluted the hook field with full screenplay text. */
export function resolveHookAfterScript(input: {
  titleHook: string
  outputHook: string
  script: string
  emotion?: string
}): string {
  const emotion = input.emotion?.trim()
  const title = formatFinalHook(input.titleHook, { emotion })
  const fromOutput = formatFinalHook(input.outputHook, { emotion })
  const fromScript = formatFinalHook(extractHookFromScript(input.script), { emotion })

  if (looksLikeScreenplay(input.outputHook) && title) return title
  if (fromOutput && !looksLikeScreenplay(input.outputHook)) return fromOutput
  if (title) return title
  if (fromScript) return fromScript
  return fromOutput
}

/** Display-safe hook line for panels — applies final formatting. */
export function displayHookText(hook: string, options?: { emotion?: string }): string {
  return formatFinalHook(hook, options)
}
