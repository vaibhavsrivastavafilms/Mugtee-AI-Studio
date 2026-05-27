import type { CinematicNiche } from '@/lib/cinematic/niches'

export type CreatorMemory = {
  niche?: CinematicNiche
  voiceStyle?: string
  lastTitle?: string
  projectCount: number
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
  return `Your last world "${mem.lastTitle.slice(0, 48)}" still lives here.`
}

export function cinematicIdentityContinuity(niche?: CinematicNiche): string | null {
  const mem = readCreatorMemory()
  if (!mem.niche || !niche || mem.niche === niche) return null
  return `Your ${mem.niche} voice carries forward.`
}
