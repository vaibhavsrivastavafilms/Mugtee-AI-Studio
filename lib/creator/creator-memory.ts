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

// ─── Creator Memory Profile (Phase 2.3) ───────────────────────────

export const CREATOR_PLATFORMS = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'multi', label: 'Multi-platform' },
] as const

export const CREATOR_CONTENT_STYLES = [
  { id: 'storytelling', label: 'Storytelling' },
  { id: 'documentary', label: 'Documentary' },
  { id: 'educational', label: 'Educational' },
  { id: 'personal_brand', label: 'Personal Brand' },
  { id: 'business', label: 'Business' },
  { id: 'entertainment', label: 'Entertainment' },
] as const

export const CREATOR_PROFILE_TONES = [
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'emotional', label: 'Emotional' },
  { id: 'professional', label: 'Professional' },
  { id: 'authority', label: 'Authority' },
  { id: 'viral', label: 'Viral' },
  { id: 'minimalist', label: 'Minimalist' },
] as const

export type CreatorMemoryProfile = {
  creatorName?: string
  primaryPlatform?: string
  contentStyle?: string
  tone?: string
  audience?: string
  channelDescription?: string
  /** Legacy niche id — synced from viral studio localStorage */
  niche?: string
  /** Sidekick profile — grow, monetize, authority, consistency, learn */
  creatorGoal?: string
  /** Sidekick profile — beginner, intermediate, advanced */
  experience?: string
  updatedAt?: string
}

export type CreatorProfileOverride = Partial<CreatorMemoryProfile>

const CREATOR_PROFILE_CACHE_KEY = 'mugtee:creator:profile:v1'
const PROFILE_FIELD_LIMITS = {
  creatorName: 120,
  audience: 500,
  channelDescription: 1200,
} as const

function labelForId(
  list: readonly { id: string; label: string }[],
  id?: string
): string | undefined {
  if (!id?.trim()) return undefined
  return list.find((item) => item.id === id)?.label ?? id
}

function trimField(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : undefined
}

export function normalizeCreatorMemoryProfile(
  raw: unknown
): CreatorMemoryProfile {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const o = raw as Record<string, unknown>
  const pick = (key: keyof CreatorMemoryProfile, max = 80) =>
    trimField(o[key], max)

  return {
    creatorName: pick('creatorName', PROFILE_FIELD_LIMITS.creatorName),
    primaryPlatform: pick('primaryPlatform'),
    contentStyle: pick('contentStyle'),
    tone: pick('tone'),
    audience: pick('audience', PROFILE_FIELD_LIMITS.audience),
    channelDescription: pick(
      'channelDescription',
      PROFILE_FIELD_LIMITS.channelDescription
    ),
    niche: pick('niche'),
    creatorGoal: pick('creatorGoal'),
    experience: pick('experience'),
    updatedAt:
      typeof o.updatedAt === 'string' && o.updatedAt.trim()
        ? o.updatedAt.trim()
        : undefined,
  }
}

export function hasCreatorProfileContent(
  profile?: CreatorMemoryProfile | null
): boolean {
  if (!profile) return false
  return Boolean(
    profile.creatorName ||
      profile.primaryPlatform ||
      profile.contentStyle ||
      profile.tone ||
      profile.audience ||
      profile.channelDescription ||
      profile.niche ||
      profile.creatorGoal ||
      profile.experience
  )
}

/** Project overrides win over global creator profile when both are set. */
export function getEffectiveCreatorProfile(
  base?: CreatorMemoryProfile | null,
  override?: CreatorProfileOverride | null
): CreatorMemoryProfile | null {
  const merged = { ...(base ?? {}), ...(override ?? {}) }
  return hasCreatorProfileContent(merged) ? merged : null
}

export function creatorProfileDirective(
  profile?: CreatorMemoryProfile | null
): string {
  if (!hasCreatorProfileContent(profile)) return ''
  const p = profile!
  const lines = [
    p.creatorName ? `Creator name: ${p.creatorName}` : '',
    p.primaryPlatform
      ? `Primary platform: ${labelForId(CREATOR_PLATFORMS, p.primaryPlatform) ?? p.primaryPlatform}`
      : '',
    p.contentStyle
      ? `Content style: ${labelForId(CREATOR_CONTENT_STYLES, p.contentStyle) ?? p.contentStyle}`
      : '',
    p.tone
      ? `Voice tone: ${labelForId(CREATOR_PROFILE_TONES, p.tone) ?? p.tone}`
      : '',
    p.audience ? `Target audience: ${p.audience}` : '',
    p.channelDescription
      ? `Channel description: ${p.channelDescription}`
      : '',
    p.niche ? `Creator niche (legacy): ${p.niche}` : '',
  ].filter(Boolean)
  return [
    'CREATOR MEMORY PROFILE (honor when compatible — project brief overrides):',
    ...lines,
  ].join('\n')
}

/** Synchronous localStorage cache — use for instant pipeline cold start. */
export function getCachedCreatorMemoryProfile(): CreatorMemoryProfile {
  return readCachedCreatorProfile()
}

function readCachedCreatorProfile(): CreatorMemoryProfile {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CREATOR_PROFILE_CACHE_KEY)
    if (!raw) return {}
    return normalizeCreatorMemoryProfile(JSON.parse(raw))
  } catch {
    return {}
  }
}

function writeCachedCreatorProfile(profile: CreatorMemoryProfile): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      CREATOR_PROFILE_CACHE_KEY,
      JSON.stringify({
        ...profile,
        updatedAt: profile.updatedAt ?? new Date().toISOString(),
      })
    )
  } catch {
    /* ignore */
  }
}

export type CreatorProfileStatus = {
  hasProfile: boolean
  profile: CreatorMemoryProfile
}

function parseCreatorProfileResponse(data: Record<string, unknown>): CreatorMemoryProfile {
  return normalizeCreatorMemoryProfile(data.creator_profile ?? data.creatorProfile)
}

/** Load creator profile — creator_profiles table API, profile API fallback, then cache. */
export async function fetchCreatorMemoryProfile(): Promise<CreatorMemoryProfile> {
  if (typeof window === 'undefined') return {}
  try {
    const res = await fetch('/api/creator-profile', { cache: 'no-store' })
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>
      const profile = parseCreatorProfileResponse(data)
      if (hasCreatorProfileContent(profile)) {
        writeCachedCreatorProfile(profile)
        return profile
      }
    }
  } catch {
    /* fall through */
  }
  try {
    const res = await fetch('/api/profile', { cache: 'no-store' })
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>
      const profile = parseCreatorProfileResponse(data)
      if (hasCreatorProfileContent(profile)) {
        writeCachedCreatorProfile(profile)
        return profile
      }
    }
  } catch {
    /* fall through to cache */
  }
  return readCachedCreatorProfile()
}

/** Whether the user has a creator_profiles table row (onboarding complete). */
export async function fetchCreatorProfileStatus(): Promise<CreatorProfileStatus> {
  if (typeof window === 'undefined') {
    return { hasProfile: false, profile: {} }
  }
  try {
    const res = await fetch('/api/creator-profile', { cache: 'no-store' })
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>
      const profile = parseCreatorProfileResponse(data)
      if (hasCreatorProfileContent(profile)) {
        writeCachedCreatorProfile(profile)
      }
      return {
        hasProfile: Boolean(data.has_profile),
        profile,
      }
    }
  } catch {
    /* fall through */
  }
  const cached = readCachedCreatorProfile()
  return {
    hasProfile: hasCreatorProfileContent(cached),
    profile: cached,
  }
}

/** Persist creator profile via creator_profiles API + local cache. */
export async function saveCreatorMemoryProfile(
  patch: CreatorProfileOverride
): Promise<CreatorMemoryProfile> {
  const next = normalizeCreatorMemoryProfile({
    ...readCachedCreatorProfile(),
    ...patch,
    updatedAt: new Date().toISOString(),
  })
  writeCachedCreatorProfile(next)
  try {
    const res = await fetch('/api/creator-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator_profile: next }),
    })
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>
      const saved = parseCreatorProfileResponse(data) ?? next
      writeCachedCreatorProfile(saved)
      return saved
    }
  } catch {
    /* offline — cache only */
  }
  return next
}
