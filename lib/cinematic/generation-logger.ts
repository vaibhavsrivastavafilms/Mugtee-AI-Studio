import type { PersistedGenerationStep } from '@/lib/cinematic/generation-state'

type LogPayload = Record<string, unknown>

/** Post-voice pipeline audit stages (storyboard → export). */
export type PipelineAuditStage =
  | 'storyboard'
  | 'assets'
  | 'storage'
  | 'project_save'
  | 'project_reload'
  | 'export'

export type StoryboardFrameLog = {
  frameId: string
  imageUrl?: string | null
  storagePath?: string | null
  persisted: boolean
}

export type VideoAssetLog = {
  videoJobId: string
  persisted: boolean
  retrievable: boolean
}

function shouldLogPipeline(): boolean {
  return (
    process.env.PIPELINE_DEBUG === 'true' ||
    process.env.NODE_ENV !== 'production'
  )
}

function payload(projectId?: string | null, extra?: LogPayload): LogPayload {
  return {
    ...(projectId ? { projectId } : {}),
    ...extra,
  }
}

export function logPipelineStepStart(
  stage: PipelineAuditStage,
  projectId?: string | null,
  extra?: LogPayload
): void {
  if (!shouldLogPipeline()) return
  console.info('[STEP_START]', payload(projectId, { stage, ...extra }))
}

export function logPipelineStepComplete(
  stage: PipelineAuditStage,
  projectId?: string | null,
  extra?: LogPayload
): void {
  if (!shouldLogPipeline()) return
  console.info('[STEP_COMPLETE]', payload(projectId, { stage, ...extra }))
}

export function logPipelineStepError(
  stage: PipelineAuditStage,
  projectId: string | null | undefined,
  reason: string,
  extra?: LogPayload
): void {
  if (!shouldLogPipeline()) return
  console.warn(
    '[STEP_ERROR]',
    payload(projectId, { stage, reason: reason.slice(0, 300), ...extra })
  )
}

export function logStoryboardFrame(
  projectId: string | null | undefined,
  frame: StoryboardFrameLog
): void {
  if (!shouldLogPipeline()) return
  console.info(
    '[STEP_COMPLETE]',
    payload(projectId, { stage: 'storyboard', frame })
  )
}

export function logVideoAsset(
  projectId: string | null | undefined,
  asset: VideoAssetLog
): void {
  if (!shouldLogPipeline()) return
  console.info('[STEP_COMPLETE]', payload(projectId, { stage: 'assets', asset }))
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
