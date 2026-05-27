import type { CinematicNiche } from '@/lib/cinematic/niches'
import type { CinematicProjectStatus } from '@/stores/cinematic-project'

export type CreatorPreferenceKey =
  | 'lastNiche'
  | 'preferredRewriteMode'
  | 'preferredPlatform'
  | 'recentTones'
  | 'recentStoryboardStyles'
  | 'lastProjectId'
  | 'lastProjectTitle'
  | 'lastProjectStatus'

export type CreatorPreferences = {
  lastNiche?: CinematicNiche | string
  preferredRewriteMode?: string
  preferredPlatform?: string
  recentTones?: string[]
  recentStoryboardStyles?: string[]
  lastProjectId?: string
  lastProjectTitle?: string
  lastProjectStatus?: CinematicProjectStatus | string
  updatedAt?: string
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

export function saveCreatorPreference(
  key: CreatorPreferenceKey,
  value: string | string[]
): void {
  const prefs = readPrefs()
  if (key === 'recentTones' || key === 'recentStoryboardStyles') {
    const list = Array.isArray(value) ? value : [value]
    const existing = (prefs[key] as string[] | undefined) ?? []
    const next = [list[0], ...existing.filter((v) => v !== list[0])].slice(
      0,
      MAX_RECENT
    )
    prefs[key] = next
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

export function rememberCreativeSession(input: {
  niche?: string
  style?: string
  platform?: string
  storyboardStyle?: string
  projectId?: string
  projectTitle?: string
  projectStatus?: string
}) {
  if (input.niche) saveCreatorPreference('lastNiche', input.niche)
  if (input.style) {
    saveCreatorPreference('preferredRewriteMode', input.style)
    saveCreatorPreference('recentTones', input.style)
  }
  if (input.platform) saveCreatorPreference('preferredPlatform', input.platform)
  if (input.storyboardStyle) {
    saveCreatorPreference('recentStoryboardStyles', input.storyboardStyle)
  }
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
  recentTones: string[]
} {
  const prefs = readPrefs()
  return {
    niche: prefs.lastNiche,
    tone: prefs.preferredRewriteMode,
    platform: prefs.preferredPlatform,
    storyboardStyle: prefs.recentStoryboardStyles?.[0],
    recentTones: prefs.recentTones ?? [],
  }
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
