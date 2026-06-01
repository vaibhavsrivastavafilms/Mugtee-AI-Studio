'use client'

import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { SceneBlueprint } from '@/lib/cinematic/scene-blueprint'
import type { VisualStyle } from '@/lib/cinematic/workflow-state'
import type { SceneMotionMap } from '@/lib/motion/scene-motion-types'
import { applyVideoResultToScene } from '@/lib/video/scene-video-shared'

export type SceneVideoJobPoll = {
  jobId: string
  sceneId: string
  pollUrl: string
}

type PollResult = {
  status: 'queued' | 'running' | 'done' | 'failed'
  videoUrl?: string | null
  thumbnailUrl?: string | null
  error?: string | null
}

async function pollVideoJob(pollUrl: string): Promise<PollResult> {
  const res = await fetch(pollUrl, { cache: 'no-store' })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    return { status: 'failed', error: String(data.error ?? 'Poll failed') }
  }
  return {
    status: (data.status as PollResult['status']) ?? 'queued',
    videoUrl: typeof data.videoUrl === 'string' ? data.videoUrl : null,
    thumbnailUrl: typeof data.thumbnailUrl === 'string' ? data.thumbnailUrl : null,
    error: typeof data.error === 'string' ? data.error : null,
  }
}

export async function queueSceneVideos(input: {
  scenes: GeneratedScene[]
  sceneBlueprints?: SceneBlueprint[]
  sceneMotion?: SceneMotionMap | null
  visualStyle?: VisualStyle | null
  projectId?: string | null
  sceneIds?: string[]
}): Promise<SceneVideoJobPoll[]> {
  const targets = input.sceneIds?.length
    ? input.scenes.filter((s) => input.sceneIds!.includes(s.id) && s.imageUrl?.trim())
    : input.scenes.filter((s) => s.imageUrl?.trim() && !s.videoUrl?.trim())

  if (targets.length === 0) return []

  const res = await fetch('/api/generate-scene-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      async: true,
      projectId: input.projectId,
      scenes: targets,
      sceneBlueprints: input.sceneBlueprints,
      sceneMotion: input.sceneMotion,
      visualStyle: input.visualStyle,
    }),
  })

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new Error(String(data.error ?? 'Failed to queue scene videos'))
  }

  const jobs = Array.isArray(data.jobs) ? data.jobs : []
  return jobs
    .map((j) => {
      if (!j || typeof j !== 'object') return null
      const row = j as Record<string, unknown>
      const jobId = typeof row.jobId === 'string' ? row.jobId : ''
      const sceneId = typeof row.sceneId === 'string' ? row.sceneId : ''
      const pollUrl = typeof row.pollUrl === 'string' ? row.pollUrl : ''
      if (!jobId || !sceneId || !pollUrl) return null
      return { jobId, sceneId, pollUrl }
    })
    .filter((j): j is SceneVideoJobPoll => Boolean(j))
}

export async function pollSceneVideoJobs(
  jobs: SceneVideoJobPoll[],
  onUpdate: (sceneId: string, patch: Partial<GeneratedScene>) => void,
  options?: { maxAttempts?: number; intervalMs?: number }
): Promise<void> {
  const pending = new Map(jobs.map((j) => [j.sceneId, j]))
  const maxAttempts = options?.maxAttempts ?? 90
  const intervalMs = options?.intervalMs ?? 4000

  for (let attempt = 0; attempt < maxAttempts && pending.size > 0; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, intervalMs))
    }

    for (const [sceneId, job] of [...pending.entries()]) {
      const result = await pollVideoJob(job.pollUrl)
      if (result.status === 'done' && result.videoUrl) {
        onUpdate(sceneId, applyVideoResultToScene(
          { id: sceneId } as GeneratedScene,
          {
            videoUrl: result.videoUrl,
            thumbnailUrl: result.thumbnailUrl ?? null,
            duration: 5,
            provider: 'seedance',
          },
          'ready'
        ))
        pending.delete(sceneId)
      } else if (result.status === 'failed') {
        onUpdate(sceneId, { videoGenerationStatus: 'failed' })
        pending.delete(sceneId)
      } else {
        onUpdate(sceneId, { videoGenerationStatus: 'generating' })
      }
    }
  }
}
