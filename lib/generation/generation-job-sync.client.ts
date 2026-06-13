'use client'

import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'
import type { SectionStatusMap } from '@/lib/cinematic/section-generation-status'
import {
  deriveReelPipelineState,
  reelPipelineStateToJobMetadata,
  type ReelPipelineStatus,
} from '@/lib/pipeline/reel-generation-orchestrator'
import { isValidGenerationJobId } from '@/lib/generation/generation-job-id'
import { pipelineRequiresSceneVideos } from '@/lib/economics/scene-video-requirement'
const STEP_PROGRESS: Partial<Record<QuickCutGenerationStep, number>> = {
  hook: 8,
  script: 18,
  scenes: 32,
  images: 52,
  motion: 68,
  voice: 82,
  render: 92,
  complete: 100,
}

function stepLabel(step: QuickCutGenerationStep): string {
  switch (step) {
    case 'hook':
      return 'Hook'
    case 'script':
      return 'Script'
    case 'scenes':
      return 'Visual direction'
    case 'images':
      return 'Storyboard'
    case 'motion':
      return 'Motion'
    case 'voice':
      return 'Voice'
    case 'render':
      return 'Export prep'
    case 'complete':
      return 'Complete'
    default:
      return step
  }
}

export type GenerationJobSyncInput = {
  jobId: string | null
  projectId: string | null
  generationStep: QuickCutGenerationStep
  lastCompletedStep: string | null
  isGenerating: boolean
  isComplete: boolean
  generationStatus: string
  pipelineStatus?: ReelPipelineStatus
  prompt?: string
  script?: string
  scriptBeats?: unknown[]
  scenes?: { imageUrl?: string | null; videoUrl?: string | null }[]
  voiceUrl?: string | null
  videoUrl?: string | null
  reelTimeline?: { totalDurationSec: number } | null
  isRenderingVideo?: boolean
  renderError?: string | null
  sectionStatus?: Record<string, string>
  videoRenderEnabled?: boolean
  requireSceneVideos?: boolean
  generationMode?: string
  userPlanType?: string | null
  exportJobId?: string | null
  visualTemplate?: string
}

let syncInflight: Promise<void> | null = null

/** Best-effort sync of client pipeline progress to generation_jobs (refresh-safe). */
export async function syncGenerationJobProgress(input: GenerationJobSyncInput): Promise<string | null> {
  if (!input.projectId) return input.jobId

  const derived = deriveReelPipelineState({
    jobId: input.jobId,
    isGenerating: input.isGenerating,
    isComplete: input.isComplete,
    generationStatus: input.generationStatus,
    generationStep: input.generationStep,
    sectionStatus: input.sectionStatus as SectionStatusMap | undefined,
    script: input.script,
    scriptBeats: input.scriptBeats,
    scenes: input.scenes as import('@/lib/cinematic/generation').GeneratedScene[] | undefined,
    voiceUrl: input.voiceUrl,
    videoUrl: input.videoUrl,
    reelTimeline: input.reelTimeline as import('@/lib/reel/types').ReelTimeline | null,
    isRenderingVideo: input.isRenderingVideo,
    renderError: input.renderError,
    videoRenderEnabled: input.videoRenderEnabled,
    requireSceneVideos:
      input.requireSceneVideos ??
      pipelineRequiresSceneVideos({
        generationMode: input.generationMode,
        planType: input.userPlanType,
      }),
  })

  const status = (input.pipelineStatus ?? derived.status) as ReelPipelineStatus
  const orchestratorMeta = reelPipelineStateToJobMetadata({
    ...derived,
    status,
  })
  if (input.exportJobId) {
    orchestratorMeta.exportJobId = input.exportJobId
  }
  if (input.visualTemplate) {
    orchestratorMeta.visualTemplate = input.visualTemplate
  }
  const legacyStatus =
    status === 'mp4_complete'
      ? 'completed'
      : status === 'failed'
        ? 'failed'
        : input.isGenerating
          ? 'running'
          : 'paused'

  const body = {
    projectId: input.projectId,
    jobId: input.jobId,
    status: legacyStatus,
    progress: derived.progress,
    currentStep: input.generationStep,
    lastCompletedStep: input.lastCompletedStep,
    metadata: {
      ...orchestratorMeta,
      heartbeatAt: new Date().toISOString(),
      prompt: input.prompt?.slice(0, 200),
      deviceHint: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : undefined,
    },
  }

  const run = async (): Promise<string | null> => {
    const res = await fetch('/api/generation/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.warn('[JOB_INSERT_FAILED]', {
        projectId: input.projectId,
        status: res.status,
        jobId: input.jobId,
      })
      return isValidGenerationJobId(input.jobId) ? input.jobId : null
    }
    const data = (await res.json().catch(() => ({}))) as { jobId?: string }
    const nextId = data.jobId ?? input.jobId
    if (isValidGenerationJobId(nextId)) {
      if (nextId !== input.jobId) {
        console.info('[JOB_CREATED]', { projectId: input.projectId, jobId: nextId })
      }
      return nextId
    }
    return isValidGenerationJobId(input.jobId) ? input.jobId : null
  }

  if (syncInflight) {
    await syncInflight
    return run()
  }

  const promise = run()
  syncInflight = promise.then(() => undefined).finally(() => {
    syncInflight = null
  })
  return promise
}

export type ActiveGenerationJob = {
  jobId: string
  status: string
  progress: number
  currentStep: string | null
  lastCompletedStep: string | null
  canResume: boolean
  label: string
  finalMp4Url?: string | null
  errorMessage?: string | null
}

export async function fetchActiveGenerationJob(
  projectId: string
): Promise<ActiveGenerationJob | null> {
  const res = await fetch(`/api/generation/jobs?projectId=${encodeURIComponent(projectId)}`)
  if (!res.ok) return null
  const data = (await res.json().catch(() => null)) as {
    job?: ActiveGenerationJob | null
  }
  const job = data?.job ?? null
  if (!job?.jobId || !isValidGenerationJobId(job.jobId)) return null
  return job
}
