import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'

/** Staged Craft Hook progress — drives header + output panel before API completes. */
export type HookProgressPhase =
  | 'idle'
  | 'analyzing'
  | 'angle'
  | 'candidate'
  | 'validated'

export const HOOK_PROGRESS_LABELS: Record<Exclude<HookProgressPhase, 'idle'>, string> = {
  analyzing: 'Analyzing audience…',
  angle: 'Finding story angle…',
  candidate: 'Sharpening your hook…',
  validated: 'Hook locked in.',
}

const STAGE_TIMINGS: Array<{
  ms: number
  phase: HookProgressPhase
  step: QuickCutGenerationStep
}> = [
  { ms: 500, phase: 'analyzing', step: 'analyzing' },
  { ms: 1000, phase: 'angle', step: 'title' },
  { ms: 2000, phase: 'candidate', step: 'hook' },
]

export type HookProgressPatch = {
  hookProgressPhase: HookProgressPhase
  hookProgressLabel: string | null
  generationStep?: QuickCutGenerationStep
  progress?: number
  activeStageTab?: 'title' | 'hook'
}

export type HookProgressController = {
  start: () => void
  stop: () => void
  markCandidate: (hook: string, title?: string) => void
  markValidated: (hook: string, title?: string) => void
}

export function createHookProgressController(
  apply: (patch: HookProgressPatch & { hookPreview?: string | null; hook?: string; title?: string }) => void,
  options?: { pinTab?: boolean }
): HookProgressController {
  const timers: ReturnType<typeof setTimeout>[] = []
  let stopped = false

  const clearTimers = () => {
    for (const t of timers) clearTimeout(t)
    timers.length = 0
  }

  const scheduleStage = (ms: number, phase: HookProgressPhase, step: QuickCutGenerationStep) => {
    timers.push(
      setTimeout(() => {
        if (stopped) return
        apply({
          hookProgressPhase: phase,
          hookProgressLabel: HOOK_PROGRESS_LABELS[phase === 'idle' ? 'analyzing' : phase],
          generationStep: step,
          ...(options?.pinTab ? {} : { activeStageTab: step === 'hook' ? 'hook' : 'title' }),
        })
      }, ms)
    )
  }

  return {
    start() {
      stopped = false
      clearTimers()
      apply({
        hookProgressPhase: 'analyzing',
        hookProgressLabel: HOOK_PROGRESS_LABELS.analyzing,
        hookPreview: null,
        generationStep: 'analyzing',
        activeStageTab: 'title',
      })
      for (const stage of STAGE_TIMINGS) {
        scheduleStage(stage.ms, stage.phase, stage.step)
      }
    },
    stop() {
      stopped = true
      clearTimers()
      apply({
        hookProgressPhase: 'idle',
        hookProgressLabel: null,
        hookPreview: null,
      })
    },
    markCandidate(hook, title) {
      if (stopped) return
      apply({
        hookProgressPhase: 'candidate',
        hookProgressLabel: HOOK_PROGRESS_LABELS.candidate,
        hookPreview: hook,
        ...(title ? { title } : {}),
        generationStep: 'hook',
        activeStageTab: 'hook',
      })
    },
    markValidated(hook, title) {
      if (stopped) return
      apply({
        hookProgressPhase: 'validated',
        hookProgressLabel: HOOK_PROGRESS_LABELS.validated,
        hook,
        hookPreview: null,
        ...(title ? { title } : {}),
        generationStep: 'hook',
        activeStageTab: 'hook',
      })
    },
  }
}

export function resolveHookStatusLabel(
  hookProgressLabel: string | null,
  generationStep?: QuickCutGenerationStep
): string | null {
  if (hookProgressLabel) return hookProgressLabel
  if (generationStep === 'analyzing') return HOOK_PROGRESS_LABELS.analyzing
  if (generationStep === 'title') return HOOK_PROGRESS_LABELS.angle
  if (generationStep === 'hook') return HOOK_PROGRESS_LABELS.candidate
  return null
}
