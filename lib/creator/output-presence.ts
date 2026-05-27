export const HOOK_EMPHASIS_LINES = [
  'Opening Beat',
  'Retention Trigger',
  'Audience Curiosity Established',
] as const

export function getHookEmphasisLine(seed = 0): string {
  return HOOK_EMPHASIS_LINES[seed % HOOK_EMPHASIS_LINES.length]
}

export function cinematicShotLabel(
  value: string,
  kind: 'camera' | 'lighting' | 'movement' | 'environment'
): string {
  const v = value.trim()
  if (!v) return ''
  const lower = v.toLowerCase()
  if (kind === 'camera') {
    if (lower.includes('framing') || lower.includes('composition')) return v
    return `${v} Composition`
  }
  if (kind === 'lighting') {
    if (lower.includes('light') || lower.includes('mood')) return v
    return `${v} Lighting Mood`
  }
  if (kind === 'movement') {
    if (lower.includes('track') || lower.includes('drift') || lower.includes('handheld'))
      return v
    return `${v} Camera Movement`
  }
  return v
}

export function splitScriptBlocks(script: string): string[] {
  return script
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
}

export function isDialogueBlock(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (/^[\u201C"\u2018']/.test(trimmed)) return true
  if (/^[^:]+:\s*[\u201C"\u2018']/.test(trimmed)) return true
  return trimmed.split('\n').some((line) => /^[\u201C"\u2018'-]/.test(line.trim()))
}

export function sceneRhythmLabel(index: number): string {
  if (index === 0) return 'Opening rhythm'
  if (index === 1) return 'Emotional lift'
  if (index === 2) return 'Tension beat'
  return `Beat ${index + 1}`
}
