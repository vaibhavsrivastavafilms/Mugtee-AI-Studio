import type { CinematicNiche } from '@/lib/cinematic/niches'
import type { CinematicProjectStatus } from '@/stores/cinematic-project'

export type CreatorPreferenceKey =
  | 'lastNiche'
  | 'preferredRewriteMode'
  | 'preferredPlatform'
  | 'preferredVisualStyle'
  | 'preferredPacing'
  | 'preferredHookStyle'
  | 'recentTones'
  | 'recentStoryboardStyles'
  | 'recentHookStyles'
  | 'lastProjectId'
  | 'lastProjectTitle'
  | 'lastProjectStatus'

export type CreatorPreferences = {
  lastNiche?: CinematicNiche | string
  preferredRewriteMode?: string
  preferredPlatform?: string
  preferredVisualStyle?: string
  preferredPacing?: string
  preferredHookStyle?: string
  recentTones?: string[]
  recentStoryboardStyles?: string[]
  recentHookStyles?: string[]
  lastProjectId?: string
  lastProjectTitle?: string
  lastProjectStatus?: CinematicProjectStatus | string
  updatedAt?: string
}

export type CreatorMemoryBiasHints = {
  niche?: string
  visualStyle?: string
  pacing?: string
  hookStyle?: string
  platform?: string
  recentTones?: string[]
}

const STORAGE_KEY = 'mugtee:creator:memory:v1'
const MAX_RECENT = 5

function readPrefs(): CreatorPreferences {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as CreatorPreferences
  } catch {
    return {}
  }
}

function writePrefs(prefs: CreatorPreferences) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...prefs, updatedAt: new Date().toISOString() })
    )
  } catch {
    /* ignore */
  }
}

const RECENT_LIST_KEYS = new Set<CreatorPreferenceKey>([
  'recentTones',
  'recentStoryboardStyles',
  'recentHookStyles',
])

export function saveCreatorPreference(
  key: CreatorPreferenceKey,
  value: string | string[]
): void {
  const prefs = readPrefs()
  if (RECENT_LIST_KEYS.has(key)) {
    const list = Array.isArray(value) ? value : [value]
    const existing = (prefs[key] as string[] | undefined) ?? []
    const next = [list[0], ...existing.filter((v) => v !== list[0])].slice(
      0,
      MAX_RECENT
    )
    ;(prefs as Record<string, unknown>)[key] = next
  } else {
    ;(prefs as Record<string, unknown>)[key] = value
  }
  writePrefs(prefs)
}

export function getCreatorPreference<K extends CreatorPreferenceKey>(
  key: K
): CreatorPreferences[K] {
  return readPrefs()[key]
}

export function getCreatorPreferences(): CreatorPreferences {
  return readPrefs()
}

function inferPacingFromStyle(style?: string): string | undefined {
  if (!style?.trim()) return undefined
  const key = style.toLowerCase()
  if (/documentary|history|witness/.test(key)) return 'documentary'
  if (/emotional|story|narrative/.test(key)) return 'emotional'
  if (/motivational|hook|viral/.test(key)) return 'punchy'
  if (/luxury|quiet|restraint/.test(key)) return 'measured'
  if (/cinematic|film/.test(key)) return 'cinematic'
  return style
}

export function rememberCreativeSession(input: {
  niche?: string
  style?: string
  platform?: string
  storyboardStyle?: string
  visualStyle?: string
  hookStyle?: string
  pacing?: string
  projectId?: string
  projectTitle?: string
  projectStatus?: string
}) {
  if (input.niche) saveCreatorPreference('lastNiche', input.niche)
  if (input.style) {
    saveCreatorPreference('preferredRewriteMode', input.style)
    saveCreatorPreference('recentTones', input.style)
    const pacing = input.pacing ?? inferPacingFromStyle(input.style)
    if (pacing) saveCreatorPreference('preferredPacing', pacing)
  }
  if (input.platform) saveCreatorPreference('preferredPlatform', input.platform)
  if (input.storyboardStyle) {
    saveCreatorPreference('recentStoryboardStyles', input.storyboardStyle)
  }
  if (input.visualStyle) {
    saveCreatorPreference('preferredVisualStyle', input.visualStyle)
  }
  if (input.hookStyle) {
    saveCreatorPreference('preferredHookStyle', input.hookStyle)
    saveCreatorPreference('recentHookStyles', input.hookStyle)
  } else if (input.style) {
    saveCreatorPreference('recentHookStyles', input.style)
  }
  if (input.pacing) saveCreatorPreference('preferredPacing', input.pacing)
  if (input.projectId) saveCreatorPreference('lastProjectId', input.projectId)
  if (input.projectTitle) {
    saveCreatorPreference('lastProjectTitle', input.projectTitle)
  }
  if (input.projectStatus) {
    saveCreatorPreference('lastProjectStatus', input.projectStatus)
  }
}

export function getRecentCreativePatterns(): {
  niche?: string
  tone?: string
  platform?: string
  storyboardStyle?: string
  visualStyle?: string
  pacing?: string
  hookStyle?: string
  recentTones: string[]
} {
  const prefs = readPrefs()
  return {
    niche: prefs.lastNiche,
    tone: prefs.preferredRewriteMode,
    platform: prefs.preferredPlatform,
    storyboardStyle: prefs.recentStoryboardStyles?.[0],
    visualStyle: prefs.preferredVisualStyle,
    pacing: prefs.preferredPacing,
    hookStyle: prefs.preferredHookStyle ?? prefs.recentHookStyles?.[0],
    recentTones: prefs.recentTones ?? [],
  }
}

/** Lightweight bias hints for script generation — read from localStorage on client. */
export function getCreatorMemoryBiasHints(): CreatorMemoryBiasHints {
  const prefs = readPrefs()
  return {
    niche: prefs.lastNiche,
    visualStyle: prefs.preferredVisualStyle ?? prefs.recentStoryboardStyles?.[0],
    pacing: prefs.preferredPacing ?? inferPacingFromStyle(prefs.preferredRewriteMode),
    hookStyle: prefs.preferredHookStyle ?? prefs.recentHookStyles?.[0],
    platform: prefs.preferredPlatform,
    recentTones: prefs.recentTones,
  }
}

export function buildCreatorMemoryPromptSection(
  hints?: CreatorMemoryBiasHints | null
): string {
  if (!hints) return ''
  const lines = [
    hints.niche ? `Preferred niche: ${hints.niche}` : '',
    hints.visualStyle ? `Preferred visual style: ${hints.visualStyle}` : '',
    hints.pacing ? `Preferred pacing: ${hints.pacing}` : '',
    hints.hookStyle ? `Preferred hook style: ${hints.hookStyle}` : '',
    hints.platform ? `Preferred platform: ${hints.platform}` : '',
    hints.recentTones?.length
      ? `Recent tones (bias lightly): ${hints.recentTones.slice(0, 3).join(', ')}`
      : '',
  ].filter(Boolean)
  if (!lines.length) return ''
  return [
    'CREATOR MEMORY (light bias — honor when compatible with the brief):',
    ...lines,
  ].join('\n')
}

const RESTORE_MESSAGES: Record<string, string> = {
  documentary: 'Documentary pacing restored',
  cinematic: 'Cinematic tone remembered',
  emotional: 'Emotional cadence restored',
  motivational: 'Motivational arc remembered',
  psychology: 'Psychology hook style remembered',
  luxury: 'Quiet luxury pacing restored',
  storytelling: 'Storytelling rhythm restored',
}

export function getMemoryRestoreMessage(
  style?: string | null,
  niche?: string | null
): string | null {
  const key = (niche || style || '').toLowerCase()
  if (key && RESTORE_MESSAGES[key]) return RESTORE_MESSAGES[key]
  if (style && RESTORE_MESSAGES[style]) return RESTORE_MESSAGES[style]
  if (niche) return `${String(niche)} pacing restored`
  if (style) return 'Reel hook style remembered'
  return null
}
