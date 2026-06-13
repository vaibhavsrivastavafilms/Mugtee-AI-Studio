'use client'

import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { SceneBlueprint } from '@/lib/cinematic/scene-blueprint'
import type { VisualStyle } from '@/lib/cinematic/workflow-state'
import type { SceneMotionMap } from '@/lib/motion/scene-motion-types'
import type { GenerationMode } from '@/lib/economics/generation-mode'
import { applyVideoResultToScene } from '@/lib/video/scene-video-shared'
import { logVideoAsset } from '@/lib/cinematic/generation-logger'

export type SceneVideoJobPoll = {
  jobId: string
  sceneId: string
  pollUrl: string
}

type PollResult = {
  status: 'queued' | 'running' | 'done' | 'failed' | 'skipped'
  videoUrl?: string | null
  thumbnailUrl?: string | null
  error?: string | null
  provider?: string | null
}

async function pollVideoJob(pollUrl: string): Promise<PollResult> {
  const res = await fetch(pollUrl, { cache: 'no-store' })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (res.status === 404) {
    return { status: 'skipped', error: 'Video job not found (ephemeral store)' }
  }
  if (!res.ok) {
    return { status: 'failed', error: String(data.error ?? 'Poll failed') }
  }
  return {
    status: (data.status as PollResult['status']) ?? 'queued',
    videoUrl: typeof data.videoUrl === 'string' ? data.videoUrl : null,
    thumbnailUrl: typeof data.thumbnailUrl === 'string' ? data.thumbnailUrl : null,
    error: typeof data.error === 'string' ? data.error : null,
    provider: typeof data.provider === 'string' ? data.provider : null,
  }
}

export async function queueSceneVideos(input: {
  scenes: GeneratedScene[]
  sceneBlueprints?: SceneBlueprint[]
  sceneMotion?: SceneMotionMap | null
  visualStyle?: VisualStyle | null
  projectId?: string | null
  sceneIds?: string[]
  generationMode?: GenerationMode | string
}): Promise<SceneVideoJobPoll[]> {
  const sceneHasVideoSource = (scene: GeneratedScene) => Boolean(scene.imageUrl?.trim())

  const targets = input.sceneIds?.length
    ? input.scenes.filter((s) => input.sceneIds!.includes(s.id) && sceneHasVideoSource(s))
    : input.scenes.filter((s) => sceneHasVideoSource(s) && !s.videoUrl?.trim())

  if (targets.length === 0) return []

  const res = await fetch('/api/generate-scene-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      async: true,
      projectId: input.projectId,
      generationMode: input.generationMode ?? 'creator',
      scenes: targets,
      sceneBlueprints: input.sceneBlueprints,
      sceneMotion: input.sceneMotion,
      visualStyle: input.visualStyle,
    }),
  })

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    if (res.status === 403 || res.status === 400 || res.status === 503) {
      console.warn('[scene-video] request skipped', {
        status: res.status,
        error: data.error ?? data.code,
      })
      return []
    }
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
  options?: { maxAttempts?: number; intervalMs?: number; projectId?: string | null }
): Promise<void> {
  const projectId = options?.projectId ?? null
  const pending = new Map(jobs.map((j) => [j.sceneId, j]))
  const maxAttempts = options?.maxAttempts ?? 90
  const intervalMs = options?.intervalMs ?? 4000

  for (let attempt = 0; attempt < maxAttempts && pending.size > 0; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, intervalMs))
    }

    for (const [sceneId, job] of [...pending.entries()]) {
      const result = await pollVideoJob(job.pollUrl)
      if (result.status === 'skipped') {
        logVideoAsset(projectId, {
          videoJobId: job.jobId,
          persisted: false,
          retrievable: false,
        })
        pending.delete(sceneId)
        continue
      }
      if (result.status === 'done' && result.videoUrl) {
        logVideoAsset(projectId, {
          videoJobId: job.jobId,
          persisted: Boolean(result.videoUrl),
          retrievable: true,
        })
        const provider =
          result.provider === 'runway' || result.provider === 'seedance'
            ? result.provider
            : 'runway'
        onUpdate(sceneId, applyVideoResultToScene(
          { id: sceneId } as GeneratedScene,
          {
            videoUrl: result.videoUrl,
            thumbnailUrl: result.thumbnailUrl ?? null,
            duration: 5,
            provider,
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
