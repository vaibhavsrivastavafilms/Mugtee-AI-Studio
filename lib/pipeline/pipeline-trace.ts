import { withStepTimeout, type StepTimeoutError } from '@/lib/pipeline/with-step-timeout'

type LogPayload = Record<string, unknown>

export function shouldTracePipeline(): boolean {
  return (
    process.env.PIPELINE_DEBUG === 'true' ||
    process.env.NODE_ENV !== 'production'
  )
}

function tracePayload(extra?: LogPayload): LogPayload {
  return { ts: Date.now(), ...extra }
}

export function logTraceEnter(stepName: string, extra?: LogPayload): void {
  if (!shouldTracePipeline()) return
  console.info('[TRACE_ENTER]', stepName, tracePayload(extra))
}

export function logTraceExit(stepName: string, extra?: LogPayload): void {
  if (!shouldTracePipeline()) return
  console.info('[TRACE_EXIT]', stepName, tracePayload(extra))
}

export function logStepStart(step: string, extra?: LogPayload): void {
  if (!shouldTracePipeline()) return
  console.info('[STEP_START]', step, tracePayload(extra))
}

export function logStepSuccess(step: string, durationMs: number, extra?: LogPayload): void {
  if (!shouldTracePipeline()) return
  console.info('[STEP_SUCCESS]', { step, durationMs, ...tracePayload(extra) })
}

export function logStepFailure(step: string, error: unknown, extra?: LogPayload): void {
  if (!shouldTracePipeline()) return
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'unknown'
  console.error('[STEP_FAILURE]', {
    step,
    error: message.slice(0, 400),
    ...tracePayload(extra),
  })
}

export function logStateTransition(
  previousState: string,
  nextState: string,
  extra?: LogPayload
): void {
  if (!shouldTracePipeline()) return
  console.info('[STATE_TRANSITION]', { previousState, nextState, ...tracePayload(extra) })
}

export function logPipelineStalled(currentStep: string, extra?: LogPayload): void {
  if (!shouldTracePipeline()) return
  console.error('[PIPELINE_STALLED]', { currentStep, ...tracePayload(extra) })
}

export function logStoryboardStart(source: string, extra?: LogPayload): void {
  if (!shouldTracePipeline()) return
  console.info('[STORYBOARD_START]', { source, ...tracePayload(extra) })
}

export function logStoryboardInput(extra: LogPayload): void {
  if (!shouldTracePipeline()) return
  console.info('[STORYBOARD_INPUT]', tracePayload(extra))
}

export function logStoryboardComplete(extra?: LogPayload): void {
  if (!shouldTracePipeline()) return
  console.info('[STORYBOARD_COMPLETE]', tracePayload(extra))
}

export function logStoryboardError(error: unknown, extra?: LogPayload): void {
  if (!shouldTracePipeline()) return
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'unknown'
  console.error('[STORYBOARD_ERROR]', { error: message.slice(0, 400), ...tracePayload(extra) })
}

export function logStepShouldRunDecision(
  resumeFrom: string | null,
  step: string,
  shouldRun: boolean
): void {
  if (!shouldTracePipeline()) return
  console.info('[STEP_SHOULD_RUN]', { resumeFrom, step, shouldRun })
}

/** Run an async pipeline step with trace + optional timeout. */
export async function runTracedStep<T>(
  stepName: string,
  fn: () => Promise<T>,
  options?: { timeoutMs?: number; projectId?: string | null }
): Promise<T> {
  const startedAt = Date.now()
  logTraceEnter(stepName, { projectId: options?.projectId ?? undefined })
  logStepStart(stepName, { projectId: options?.projectId ?? undefined })
  try {
    const result = await withStepTimeout(
      stepName,
      fn(),
      options?.timeoutMs ?? 60_000
    )
    logStepSuccess(stepName, Date.now() - startedAt, {
      projectId: options?.projectId ?? undefined,
    })
    logTraceExit(stepName, { projectId: options?.projectId ?? undefined })
    return result
  } catch (err) {
    logStepFailure(stepName, err, { projectId: options?.projectId ?? undefined })
    logTraceExit(stepName, {
      projectId: options?.projectId ?? undefined,
      failed: true,
      timedOut: isStepTimeout(err),
    })
    throw err
  }
}

export function isStepTimeout(err: unknown): err is StepTimeoutError {
  return err instanceof Error && err.name === 'StepTimeoutError'
}

let pipelineWatchdogTimer: ReturnType<typeof setTimeout> | null = null

/** Fire `[PIPELINE_STALLED]` if no progress within `stallMs` (default 30s). */
export function armPipelineWatchdog(
  currentStep: string,
  extra?: LogPayload,
  stallMs = 30_000
): void {
  clearPipelineWatchdog()
  pipelineWatchdogTimer = setTimeout(() => {
    logPipelineStalled(currentStep, extra)
  }, stallMs)
}

export function clearPipelineWatchdog(): void {
  if (pipelineWatchdogTimer) {
    clearTimeout(pipelineWatchdogTimer)
    pipelineWatchdogTimer = null
  }
}
