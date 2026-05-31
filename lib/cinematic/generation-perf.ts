/** Dev timing + first-party analytics for quick-cut generation steps. */

import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackEvent } from '@/lib/analytics/track-event'

export type GenerationPerfStep =
  | 'content_brief'
  | 'hook'
  | 'research'
  | 'script'
  | 'visual_direction'
  | 'storyboard'
  | 'voice'
  | 'export'
  | 'pipeline'

/** Map internal steps to funnel section labels for admin perf charts. */
const ANALYTICS_SECTION: Partial<Record<GenerationPerfStep, string>> = {
  hook: 'hook',
  script: 'script',
  storyboard: 'storyboard',
  visual_direction: 'thumbnail',
  voice: 'captions',
  export: 'export',
}

const IS_DEV = process.env.NODE_ENV === 'development'

type StepOutcome = {
  success?: boolean
  failure?: string | null
  projectId?: string | null
}

class GenerationPerfLogger {
  private marks = new Map<GenerationPerfStep, number>()

  start(step: GenerationPerfStep): void {
    this.marks.set(step, performance.now())
    if (IS_DEV) console.time(`[gen-perf] ${step}`)
  }

  end(step: GenerationPerfStep, outcome: StepOutcome = {}): void {
    const start = this.marks.get(step)
    const endTime = performance.now()
    const durationMs = start != null ? Math.round(endTime - start) : undefined

    if (IS_DEV) {
      console.timeEnd(`[gen-perf] ${step}`)
      if (durationMs != null) {
        console.log(`[gen-perf] ${step}: ${durationMs}ms`)
      }
    }

    const section = ANALYTICS_SECTION[step]
    if (section && durationMs != null) {
      trackEvent(AnalyticsEvents.GENERATION_STEP_PERF, {
        projectId: outcome.projectId,
        metadata: {
          generationStep: step,
          section,
          generation_start_time: start,
          generation_end_time: endTime,
          duration_ms: durationMs,
          success: outcome.success ?? true,
          failure: outcome.failure ?? null,
        },
      })
    }

    this.marks.delete(step)
  }

  log(step: GenerationPerfStep, message: string, extra?: Record<string, unknown>): void {
    if (!IS_DEV) return
    console.log(`[gen-perf] ${step}: ${message}`, extra ?? '')
  }
}

export const genPerf = new GenerationPerfLogger()
