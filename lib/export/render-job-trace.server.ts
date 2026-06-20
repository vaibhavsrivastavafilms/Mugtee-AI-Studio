import 'server-only'

import type { RenderJobStatus } from '@/lib/video/types'

export type RenderJobTracePayload = {
  jobId: string
  status: string
  progress: number
  updatedAt: number | string | null
  outputPath: string | null
  mp4Exists: boolean
  stage?: string | null
  label?: string | null
  error?: string | null
}

export function logRenderJobTrace(payload: RenderJobTracePayload): void {
  console.log('[RENDER_JOB_TRACE]', JSON.stringify(payload))
}

export function logJobStatusTransition(params: {
  jobId: string
  from: string | null
  to: string
  stage?: string | null
  label?: string | null
  reason?: string | null
}): void {
  console.log(
    '[JOB_STATUS_TRANSITION]',
    JSON.stringify({
      jobId: params.jobId,
      from: params.from,
      to: params.to,
      stage: params.stage ?? null,
      label: params.label ?? null,
      reason: params.reason ?? null,
      at: new Date().toISOString(),
    })
  )
}

export function logRenderCompletion(params: {
  jobId: string
  projectId: string | null
  durationMs: number | null
  outputPath: string | null
  mp4Exists: boolean
  status: 'complete' | 'failed' | 'skipped'
  error?: string | null
}): void {
  console.log('[RENDER_COMPLETION]', JSON.stringify({ ...params, at: new Date().toISOString() }))
}

export function logUploadCompletion(params: {
  jobId: string
  projectId: string | null
  durationMs: number | null
  storagePath: string | null
  downloadUrl: string | null
  status: 'complete' | 'failed' | 'skipped'
  error?: string | null
}): void {
  console.log('[UPLOAD_COMPLETION]', JSON.stringify({ ...params, at: new Date().toISOString() }))
}

export function renderJobTraceFromStatus(
  job: RenderJobStatus,
  mp4Exists = Boolean(job.videoUrl?.trim())
): RenderJobTracePayload {
  return {
    jobId: job.jobId,
    status: job.status,
    progress: Math.round(job.percent),
    updatedAt: job.updatedAt ?? null,
    outputPath: job.videoUrl?.trim() || null,
    mp4Exists,
    stage: job.stage ?? null,
    label: job.label ?? null,
    error: job.error ?? null,
  }
}
