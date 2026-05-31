import type { PersistedGenerationStep } from '@/lib/cinematic/generation-state'

type LogPayload = Record<string, unknown>

function payload(projectId?: string | null, extra?: LogPayload): LogPayload {
  return {
    ...(projectId ? { projectId } : {}),
    ...extra,
  }
}

export function logGenerationStart(projectId: string | null, topicPreview: string) {
  console.info('[GENERATION_START]', payload(projectId, { topic: topicPreview.slice(0, 48) }))
}

export function logStepComplete(
  step: PersistedGenerationStep,
  projectId?: string | null
) {
  console.info('[STEP_COMPLETE]', payload(projectId, { step }))
}

export function logStepFailed(
  step: PersistedGenerationStep,
  projectId: string | null | undefined,
  reason: string
) {
  console.warn('[STEP_FAILED]', payload(projectId, { step, reason: reason.slice(0, 200) }))
}

export function logGenerationRecoverable(
  projectId: string | null | undefined,
  lastCompletedStep: PersistedGenerationStep | null,
  userMessage: string
) {
  console.warn(
    '[GENERATION_RECOVERABLE]',
    payload(projectId, { lastCompletedStep, message: userMessage })
  )
}

export function logGenerationResumed(
  projectId: string | null | undefined,
  resumeFrom: PersistedGenerationStep | null
) {
  console.info('[GENERATION_RESUMED]', payload(projectId, { resumeFrom }))
}

export function logGenerationSuccess(
  projectId: string | null | undefined,
  extra?: LogPayload
) {
  console.info('[GENERATION_SUCCESS]', payload(projectId, extra))
}

export function logGenerationError(
  projectId: string | null | undefined,
  step: string | null | undefined,
  serverDetail: string,
  extra?: LogPayload
) {
  console.error(
    '[GENERATION_ERROR]',
    payload(projectId, {
      step,
      detail: serverDetail.slice(0, 500),
      ...extra,
    })
  )
}
