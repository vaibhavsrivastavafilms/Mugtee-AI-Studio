/** Dev-only timing for quick-cut generation steps. */

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

const IS_DEV = process.env.NODE_ENV === 'development'

class GenerationPerfLogger {
  private marks = new Map<GenerationPerfStep, number>()

  start(step: GenerationPerfStep): void {
    if (!IS_DEV) return
    this.marks.set(step, performance.now())
    console.time(`[gen-perf] ${step}`)
  }

  end(step: GenerationPerfStep): void {
    if (!IS_DEV) return
    console.timeEnd(`[gen-perf] ${step}`)
    const start = this.marks.get(step)
    if (start != null) {
      console.log(`[gen-perf] ${step}: ${Math.round(performance.now() - start)}ms`)
      this.marks.delete(step)
    }
  }

  log(step: GenerationPerfStep, message: string, extra?: Record<string, unknown>): void {
    if (!IS_DEV) return
    console.log(`[gen-perf] ${step}: ${message}`, extra ?? '')
  }
}

export const genPerf = new GenerationPerfLogger()
