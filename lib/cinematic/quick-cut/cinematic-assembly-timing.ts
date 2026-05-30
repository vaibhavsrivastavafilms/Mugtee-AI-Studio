import type { GeneratedScene } from '@/lib/cinematic/generation'

/** Presentation-only assembly window (does not block API generation). */
export const ASSEMBLY_MIN_MS = 3000
export const ASSEMBLY_MAX_MS = 6000
export const ASSEMBLY_REVEAL_MS = 1400
export const ASSEMBLY_TEXT_INTERVAL_MS = 900

export const ASSEMBLY_STATUS_LINES = [
  'Assembling visual narrative',
  'Synchronizing scene pacing',
  'Preparing cinematic sequence',
  'Shaping emotional rhythm',
] as const

export type CinematicGenerationState = 'idle' | 'assembling' | 'revealing' | 'preview'

export function scenesReadyForAssembly(scenes: GeneratedScene[]): boolean {
  if (scenes.length < 1) return false
  const withImages = scenes.filter((s) => Boolean(s.imageUrl?.trim()))
  return withImages.length >= Math.min(2, scenes.length)
}

export function assemblyDurationMs(sceneCount: number): number {
  const span = ASSEMBLY_MAX_MS - ASSEMBLY_MIN_MS
  const t = Math.min(1, Math.max(0, (sceneCount - 2) / 6))
  return Math.round(ASSEMBLY_MIN_MS + span * t)
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
