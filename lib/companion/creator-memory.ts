import type { CreatorMemory, CreativeBrief, ReflectionHighlight } from '@/lib/companion/types'

export function normalizeCreatorMemory(raw: unknown): CreatorMemory {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const o = raw as Record<string, unknown>
  const str = (key: string, max = 120) => {
    const v = o[key]
    return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined
  }
  const strList = (key: string, max = 8) => {
    const v = o[key]
    if (!Array.isArray(v)) return undefined
    const list = v
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      .map((x) => x.trim().slice(0, 80))
      .slice(0, max)
    return list.length ? list : undefined
  }
  const duration =
    typeof o.preferredDuration === 'number' && o.preferredDuration > 0
      ? Math.min(180, Math.floor(o.preferredDuration))
      : undefined

  return {
    favoriteNiches: strList('favoriteNiches'),
    preferredHookStyle: str('preferredHookStyle'),
    preferredTone: str('preferredTone'),
    preferredVisualStyle: str('preferredVisualStyle'),
    preferredDuration: duration,
    commonThemes: strList('commonThemes'),
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : undefined,
  }
}

export function mergeCreatorMemory(
  base: CreatorMemory,
  patch: Partial<CreatorMemory>
): CreatorMemory {
  const pushUnique = (list: string[] | undefined, value: string, max = 8) => {
    const next = [value, ...(list ?? [])].filter(
      (v, i, arr) => arr.indexOf(v) === i
    )
    return next.slice(0, max)
  }

  return {
    favoriteNiches: patch.favoriteNiches ?? base.favoriteNiches,
    preferredHookStyle: patch.preferredHookStyle ?? base.preferredHookStyle,
    preferredTone: patch.preferredTone ?? base.preferredTone,
    preferredVisualStyle: patch.preferredVisualStyle ?? base.preferredVisualStyle,
    preferredDuration: patch.preferredDuration ?? base.preferredDuration,
    commonThemes: patch.commonThemes ?? base.commonThemes,
    updatedAt: new Date().toISOString(),
  }
}

/** Update memory from post-export reflection */
export function memoryFromReflection(
  memory: CreatorMemory,
  highlight: ReflectionHighlight,
  brief?: CreativeBrief | null
): CreatorMemory {
  const patch: Partial<CreatorMemory> = {}

  if (brief?.theme) {
    patch.commonThemes = [
      brief.theme,
      ...(memory.commonThemes ?? []),
    ].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 8)
  }

  if (highlight === 'hook') patch.preferredHookStyle = 'strong_open'
  if (highlight === 'visuals') patch.preferredVisualStyle = 'visual_first'
  if (highlight === 'story') patch.preferredTone = brief?.tone ?? memory.preferredTone ?? 'story_driven'

  return mergeCreatorMemory(memory, patch)
}

/** Update memory from completed project patterns */
export function memoryFromProjectPatterns(
  memory: CreatorMemory,
  input: {
    niche?: string
    tone?: string
    visualStyle?: string
    duration?: number
    theme?: string
  }
): CreatorMemory {
  const patch: Partial<CreatorMemory> = {}

  if (input.niche) {
    patch.favoriteNiches = [
      input.niche,
      ...(memory.favoriteNiches ?? []),
    ].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 8)
  }
  if (input.tone) patch.preferredTone = input.tone
  if (input.visualStyle) patch.preferredVisualStyle = input.visualStyle
  if (input.duration) patch.preferredDuration = input.duration
  if (input.theme) {
    patch.commonThemes = [
      input.theme,
      ...(memory.commonThemes ?? []),
    ].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 8)
  }

  return mergeCreatorMemory(memory, patch)
}

export function buildCreatorMemoryPromptSection(memory?: CreatorMemory | null): string {
  if (!memory) return ''
  const lines = [
    memory.favoriteNiches?.length
      ? `Favorite niches: ${memory.favoriteNiches.slice(0, 3).join(', ')}`
      : '',
    memory.preferredHookStyle ? `Preferred hook style: ${memory.preferredHookStyle}` : '',
    memory.preferredTone ? `Preferred tone: ${memory.preferredTone}` : '',
    memory.preferredVisualStyle ? `Preferred visual style: ${memory.preferredVisualStyle}` : '',
    memory.preferredDuration ? `Preferred duration: ${memory.preferredDuration}s` : '',
    memory.commonThemes?.length
      ? `Common themes: ${memory.commonThemes.slice(0, 3).join(', ')}`
      : '',
  ].filter(Boolean)
  if (!lines.length) return ''
  return ['CREATOR COMPANION MEMORY (light bias):', ...lines].join('\n')
}

/** Defaults for discovery chips / suggestions */
export function discoveryDefaultsFromMemory(memory?: CreatorMemory | null): {
  tone?: string
  themeChips?: string[]
} {
  if (!memory) return {}
  return {
    tone: memory.preferredTone,
    themeChips: memory.commonThemes?.slice(0, 4),
  }
}
