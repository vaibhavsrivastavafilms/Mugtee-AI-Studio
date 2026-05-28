import type { CinematicNiche } from '@/lib/cinematic/niches'
import { resolveCreatorIdentity } from '@/lib/creator/creator-identity'

export type CreatorMemory = {
  niche?: CinematicNiche
  voiceStyle?: string
  lastTitle?: string
  projectCount: number
  pacingSignature?: 'tight' | 'balanced' | 'breathing'
  directingTone?: string
}

const STORAGE_KEY = 'mugtee:creator-memory:v1'

export function readCreatorMemory(): CreatorMemory {
  if (typeof window === 'undefined') {
    return { projectCount: 0 }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { projectCount: 0 }
    return { projectCount: 0, ...JSON.parse(raw) }
  } catch {
    return { projectCount: 0 }
  }
}

export function updateCreatorMemory(partial: Partial<CreatorMemory>): CreatorMemory {
  const prev = readCreatorMemory()
  const next: CreatorMemory = {
    ...prev,
    ...partial,
    projectCount:
      typeof partial.projectCount === 'number'
        ? partial.projectCount
        : (prev.projectCount ?? 0) + 1,
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }
  return next
}

export function authoredStoryRecall(title: string): string | null {
  const mem = readCreatorMemory()
  if (!mem.lastTitle || mem.lastTitle === title) return null
  return `"${mem.lastTitle.slice(0, 48)}" still breathes in your archive.`
}

export function cinematicIdentityContinuity(niche?: CinematicNiche): string | null {
  const mem = readCreatorMemory()
  if (!mem.niche || !niche || mem.niche === niche) return null
  return `Your ${mem.niche} voice carries forward.`
}

export function recallPacingSignature(
  style?: string | null,
  niche?: string | null
): string | null {
  const mem = readCreatorMemory()
  if (!mem.pacingSignature) return null
  const id = resolveCreatorIdentity(style, niche ?? mem.niche)
  const labels: Record<NonNullable<CreatorMemory['pacingSignature']>, string> = {
    tight: 'Tight lyrical restraint',
    balanced: 'Balanced cinematic cadence',
    breathing: 'Slow-burn breathing rhythm',
  }
  return `${labels[mem.pacingSignature]} · ${id.rhythm.toLowerCase()} remembered`
}

export function recallDirectingTone(
  style?: string | null,
  niche?: string | null
): string | null {
  const mem = readCreatorMemory()
  if (mem.directingTone) return `${mem.directingTone} · directing tone recalled`
  const id = resolveCreatorIdentity(style, niche ?? mem.niche)
  if (!mem.niche && !style) return null
  return `${id.tone} · your signature atmosphere`
}

export function syncCreatorMemoryFromGeneration(input: {
  niche?: CinematicNiche
  lastTitle?: string
  voiceStyle?: string
  duration?: number
  sceneCount?: number
  style?: string | null
}): CreatorMemory {
  const beatSpacing =
    (input.duration ?? 60) <= 30
      ? 'tight'
      : (input.duration ?? 60) <= 60
        ? 'balanced'
        : 'breathing'
  const id = resolveCreatorIdentity(input.style, input.niche)
  return updateCreatorMemory({
    niche: input.niche,
    lastTitle: input.lastTitle,
    voiceStyle: input.voiceStyle,
    pacingSignature: beatSpacing,
    directingTone: id.tone,
  })
}
