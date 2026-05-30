import type { CinematicNiche } from '@/lib/cinematic/niches'

export type PacingMemory = {
  preferredBeatSpacing: 'tight' | 'balanced' | 'breathing'
  avgSceneCount: number
  lastDuration: number
}

const STORAGE_KEY = 'mugtee:pacing-memory:v1'

export function readPacingMemory(): PacingMemory | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PacingMemory
  } catch {
    return null
  }
}

export function writePacingMemory(input: {
  duration: number
  sceneCount: number
  beatSpacing: 'tight' | 'balanced' | 'breathing'
}): void {
  if (typeof window === 'undefined') return
  const prev = readPacingMemory()
  const avgSceneCount = prev
    ? Math.round((prev.avgSceneCount + input.sceneCount) / 2)
    : input.sceneCount
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        preferredBeatSpacing: input.beatSpacing,
        avgSceneCount,
        lastDuration: input.duration,
      } satisfies PacingMemory)
    )
  } catch {
    /* ignore quota */
  }
}

export function suggestSceneTarget(
  duration: number,
  niche: CinematicNiche
): number {
  const memory = readPacingMemory()
  const base = duration <= 30 ? 4 : 6
  if (!memory) return base
  if (Math.abs(memory.lastDuration - duration) > 20) return base
  return Math.min(10, Math.max(3, memory.avgSceneCount || base))
}
