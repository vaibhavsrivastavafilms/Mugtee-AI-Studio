/**
 * Creator OS profile — additive localStorage layer atop creator-memory.
 * No schema migrations; syncs preferences after each successful generation.
 */

import { getCreatorPreferences, saveCreatorPreference } from '@/lib/creator/creator-memory'
import type { CinematicNiche } from '@/lib/cinematic/niches'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'

const OS_PROFILE_KEY = 'mugtee:creator-os-profile:v1'

export type CreatorOsProfile = {
  voiceName: string | null
  voiceId: string | null
  tone: string | null
  niche: CinematicNiche | string | null
  captionStyle: string | null
  hookStyle: string | null
  platform: string | null
  audience: string | null
  visualStyle: string | null
  duration: number | null
  language: ProjectLanguage | string | null
  lastReelTitle: string | null
  lastReelProjectId: string | null
  updatedAt: string | null
}

const EMPTY: CreatorOsProfile = {
  voiceName: null,
  voiceId: null,
  tone: null,
  niche: null,
  captionStyle: null,
  hookStyle: null,
  platform: null,
  audience: null,
  visualStyle: null,
  duration: null,
  language: null,
  lastReelTitle: null,
  lastReelProjectId: null,
  updatedAt: null,
}

function readOsProfile(): CreatorOsProfile {
  if (typeof window === 'undefined') return { ...EMPTY }
  try {
    const raw = localStorage.getItem(OS_PROFILE_KEY)
    if (!raw) return { ...EMPTY }
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<CreatorOsProfile>) }
  } catch {
    return { ...EMPTY }
  }
}

function writeOsProfile(profile: CreatorOsProfile) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(OS_PROFILE_KEY, JSON.stringify(profile))
  } catch {
    /* quota */
  }
}

export function getCreatorOsProfile(): CreatorOsProfile {
  const os = readOsProfile()
  const legacy = getCreatorPreferences()
  return {
    ...os,
    niche: os.niche ?? legacy.lastNiche ?? null,
    platform: os.platform ?? legacy.preferredPlatform ?? null,
    visualStyle: os.visualStyle ?? legacy.preferredVisualStyle ?? null,
    hookStyle: os.hookStyle ?? legacy.preferredHookStyle ?? null,
    tone: os.tone ?? legacy.recentTones?.[0] ?? null,
    lastReelProjectId: os.lastReelProjectId ?? legacy.lastProjectId ?? null,
    lastReelTitle: os.lastReelTitle ?? legacy.lastProjectTitle ?? null,
  }
}

export type CreatorOsProfilePatch = Partial<
  Pick<
    CreatorOsProfile,
    | 'voiceName'
    | 'voiceId'
    | 'tone'
    | 'niche'
    | 'platform'
    | 'visualStyle'
    | 'hookStyle'
    | 'duration'
    | 'language'
    | 'lastReelTitle'
    | 'lastReelProjectId'
  >
>

export function updateCreatorOsProfile(patch: CreatorOsProfilePatch): CreatorOsProfile {
  const next: CreatorOsProfile = {
    ...getCreatorOsProfile(),
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  writeOsProfile(next)

  if (patch.niche) saveCreatorPreference('lastNiche', patch.niche)
  if (patch.platform) saveCreatorPreference('preferredPlatform', patch.platform)
  if (patch.visualStyle) saveCreatorPreference('preferredVisualStyle', patch.visualStyle)
  if (patch.hookStyle) saveCreatorPreference('preferredHookStyle', patch.hookStyle)
  if (patch.tone) saveCreatorPreference('recentTones', [patch.tone])
  if (patch.lastReelProjectId) saveCreatorPreference('lastProjectId', patch.lastReelProjectId)
  if (patch.lastReelTitle) saveCreatorPreference('lastProjectTitle', patch.lastReelTitle)

  return next
}

export function creatorOsPrefillDefaults(): {
  duration?: number
  platform?: string
  niche?: string
  tone?: string
  language?: string
} {
  const p = getCreatorOsProfile()
  return {
    duration: p.duration ?? undefined,
    platform: p.platform ?? undefined,
    niche: p.niche ?? undefined,
    tone: p.tone ?? undefined,
    language: p.language ?? undefined,
  }
}
