'use client'

import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'

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
  prompt?: string
}

let syncInflight: Promise<void> | null = null

/** Best-effort sync of client pipeline progress to generation_jobs (refresh-safe). */
export async function syncGenerationJobProgress(input: GenerationJobSyncInput): Promise<string | null> {
  if (!input.projectId) return input.jobId

  const progress = STEP_PROGRESS[input.generationStep] ?? 0
  const status = input.isComplete
    ? 'completed'
    : input.generationStatus === 'failed'
      ? 'failed'
      : input.isGenerating
        ? 'running'
        : 'paused'

  const body = {
    projectId: input.projectId,
    jobId: input.jobId,
    status,
    progress,
    currentStep: input.generationStep,
    lastCompletedStep: input.lastCompletedStep,
    metadata: {
      label: stepLabel(input.generationStep),
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
    if (!res.ok) return input.jobId
    const data = (await res.json().catch(() => ({}))) as { jobId?: string }
    return data.jobId ?? input.jobId
  }

  if (syncInflight) {
    await syncInflight
    return input.jobId
  }

  const promise = run()
  syncInflight = promise.then(() => undefined).finally(() => {
    syncInflight = null
  })
  return promise
}

export async function fetchActiveGenerationJob(projectId: string): Promise<{
  jobId: string
  status: string
  progress: number
  currentStep: string | null
  lastCompletedStep: string | null
  canResume: boolean
  label: string
} | null> {
  const res = await fetch(`/api/generation/jobs?projectId=${encodeURIComponent(projectId)}`)
  if (!res.ok) return null
  const data = (await res.json().catch(() => null)) as {
    job?: {
      jobId: string
      status: string
      progress: number
      currentStep: string | null
      lastCompletedStep: string | null
      canResume: boolean
      label: string
    } | null
  }
  return data?.job ?? null
}
