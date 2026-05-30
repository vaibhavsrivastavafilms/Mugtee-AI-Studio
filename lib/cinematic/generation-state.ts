/** Persisted generation status on cinematic_projects (migration 0019). */
export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed'

/** Canonical pipeline steps stored in Supabase. */
export type PersistedGenerationStep =
  | 'hook'
  | 'script'
  | 'visual_direction'
  | 'storyboard'
  | 'voice'
  | 'export'

export const PERSISTED_STEP_ORDER: PersistedGenerationStep[] = [
  'hook',
  'script',
  'visual_direction',
  'storyboard',
  'voice',
  'export',
]

export const PERSISTED_STEP_LABELS: Record<PersistedGenerationStep, string> = {
  hook: 'Hook',
  script: 'Script',
  visual_direction: 'Visual direction',
  storyboard: 'Storyboard',
  voice: 'Voice',
  export: 'Export',
}

export function stepShouldRun(
  resumeFrom: PersistedGenerationStep | null | undefined,
  step: PersistedGenerationStep
): boolean {
  if (!resumeFrom) return true
  const fromIdx = PERSISTED_STEP_ORDER.indexOf(resumeFrom)
  const stepIdx = PERSISTED_STEP_ORDER.indexOf(step)
  if (fromIdx < 0) return true
  return stepIdx > fromIdx
}

export function inferLastCompletedStep(state: {
  hook?: string
  script?: string
  scenes?: unknown[]
  voiceUrl?: string | null
  videoUrl?: string | null
  isComplete?: boolean
}): PersistedGenerationStep | null {
  if (state.videoUrl || state.isComplete) return 'export'
  if (state.voiceUrl) return 'voice'
  const scenes = state.scenes ?? []
  if (scenes.some((s) => typeof s === 'object' && s && 'imageUrl' in s && (s as { imageUrl?: string }).imageUrl)) {
    return 'storyboard'
  }
  if (scenes.length > 0) return 'visual_direction'
  if (state.script?.trim()) return 'script'
  if (state.hook?.trim()) return 'hook'
  return null
}

export function normalizeGenerationStatus(
  raw: string | null | undefined
): GenerationStatus | null {
  if (
    raw === 'pending' ||
    raw === 'generating' ||
    raw === 'completed' ||
    raw === 'failed'
  ) {
    return raw
  }
  return null
}

export function normalizePersistedStep(
  raw: string | null | undefined
): PersistedGenerationStep | null {
  if (raw && PERSISTED_STEP_ORDER.includes(raw as PersistedGenerationStep)) {
    return raw as PersistedGenerationStep
  }
  return null
}
