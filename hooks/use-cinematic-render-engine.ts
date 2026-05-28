'use client'

import { useEffect, useRef } from 'react'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import {
  RENDER_MILESTONES,
  useCinematicRenderStore,
} from '@/stores/cinematic-render-store'
import { saveProjectRenderOutput } from '@/lib/cinematic-projects'

const SIMULATION_TOTAL_MS = 38_000
const SIMULATION_COMPILE_MS = 4_200

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface CinematicRenderEngineInput {
  title: string
  hook: string
  duration: number
  style?: string
  script?: string
  voiceUrl?: string | null
  projectId?: string
  scenes: GeneratedScene[]
  previewFrames: string[]
  videoUrl?: string | null
  /** When true, only simulate — no /api/render-video call */
  simulationOnly?: boolean
  simulationDurationMs?: number
  autoStart?: boolean
  onComplete?: () => void
}

export function useCinematicRenderEngine(input: CinematicRenderEngineInput) {
  const startedRef = useRef(false)
  const abortRef = useRef(false)

  const {
    initFromProject,
    setProgress,
    setDetailLabelIndex,
    markSceneComplete,
    revealPreviewFrame,
    setRendering,
    setMode,
    setError,
    complete,
    syncFromApiJob,
    isComplete,
    isRendering,
    progress,
  } = useCinematicRenderStore()

  useEffect(() => {
    abortRef.current = false
    startedRef.current = false
    initFromProject({
      title: input.title,
      hook: input.hook,
      duration: input.duration,
      style: input.style,
      scenes: input.scenes,
      previewFrames: input.previewFrames,
      videoUrl: input.videoUrl,
    })
    return () => {
      abortRef.current = true
    }
  }, [
    input.title,
    input.hook,
    input.duration,
    input.style,
    input.videoUrl,
    input.scenes,
    input.previewFrames,
    initFromProject,
  ])

  useEffect(() => {
    if (!input.autoStart || input.videoUrl || startedRef.current) return
    if (input.scenes.length === 0 && input.previewFrames.length === 0) return
    startedRef.current = true
    void runRenderPipeline()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.autoStart, input.videoUrl, input.scenes.length, input.previewFrames.length])

  useEffect(() => {
    const timer = setInterval(() => {
      const idx = useCinematicRenderStore.getState().detailLabelIndex + 1
      setDetailLabelIndex(idx)
    }, 3200)
    return () => clearInterval(timer)
  }, [setDetailLabelIndex])

  async function finalizeRender(videoUrl?: string | null) {
    complete(videoUrl ?? undefined)
    if (input.projectId && videoUrl) {
      void saveProjectRenderOutput(input.projectId, {
        video_url: videoUrl,
        thumbnail_url: input.previewFrames[0] ?? input.scenes[0]?.imageUrl ?? null,
        status: 'complete',
        duration: input.duration,
      })
    }
    input.onComplete?.()
  }

  async function runRenderPipeline() {
    if (abortRef.current) return
    setRendering(true)
    setError(null)

    if (input.simulationOnly) {
      setMode('simulation')
      await runSimulation({
        durationMs: input.simulationDurationMs ?? SIMULATION_COMPILE_MS,
      })
      await finalizeRender(useCinematicRenderStore.getState().videoUrl)
      return
    }

    setMode('api')
    const simPromise = runSimulation({ capAt: 88 })

    try {
      const res = await fetch('/api/render-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: input.hook || input.title,
          title: input.title,
          script: input.script ?? '',
          scenes: input.scenes,
          voiceUrl: input.voiceUrl ?? null,
          projectId: input.projectId,
          async: true,
        }),
      })

      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) {
        throw new Error(String(data?.error || 'Render unavailable'))
      }

      if (typeof data.videoUrl === 'string' && data.videoUrl) {
        await simPromise.catch(() => undefined)
        await finalizeRender(data.videoUrl)
        return
      }

      const pollUrl =
        typeof data.pollUrl === 'string'
          ? data.pollUrl
          : typeof data.jobId === 'string'
            ? `/api/render-video/status/${data.jobId}`
            : null

      if (!pollUrl) {
        await simPromise
        await finalizeRender()
        return
      }

      await pollUntilDone(pollUrl, simPromise)
    } catch (err) {
      setMode('simulation')
      await runSimulation()
      if (!useCinematicRenderStore.getState().isComplete) {
        const message =
          err instanceof Error ? err.message : 'Render paused — finishing preview'
        setError(message)
        await finalizeRender()
      }
    }
  }

  async function pollUntilDone(
    pollUrl: string,
    simPromise: Promise<void>
  ) {
    const maxAttempts = 120
    for (let i = 0; i < maxAttempts; i++) {
      if (abortRef.current) return
      await delay(1500)
      const res = await fetch(pollUrl)
      const job = (await res.json()) as Record<string, unknown>
      if (!res.ok) throw new Error(String(job?.error || 'Render status unavailable'))

      syncFromApiJob({
        percent: typeof job.percent === 'number' ? job.percent : undefined,
        label: typeof job.label === 'string' ? job.label : undefined,
        videoUrl: typeof job.videoUrl === 'string' ? job.videoUrl : null,
        status: typeof job.status === 'string' ? job.status : undefined,
      })

      if (job.status === 'failed') {
        throw new Error(String(job.error || 'Video render failed'))
      }

      if (typeof job.videoUrl === 'string' && job.videoUrl) {
        await simPromise.catch(() => undefined)
        await finalizeRender(job.videoUrl)
        return
      }

      if (job.status === 'done') {
        await simPromise.catch(() => undefined)
        await finalizeRender(typeof job.videoUrl === 'string' ? job.videoUrl : null)
        return
      }
    }
    throw new Error('Video render timed out')
  }

  async function runSimulation(opts?: { capAt?: number; durationMs?: number }) {
    const cap = opts?.capAt ?? 100
    const durationMs = opts?.durationMs ?? SIMULATION_TOTAL_MS
    const sceneCount = Math.max(
      input.scenes.length,
      input.previewFrames.length,
      3
    )
    const milestones = RENDER_MILESTONES.filter((m) => m.id !== 'complete')
    const stepMs = durationMs / milestones.length

    for (let mi = 0; mi < milestones.length; mi++) {
      if (abortRef.current) return
      const milestone = milestones[mi]
      const nextPercent = Math.min(cap, milestone.percent)
      setProgress(nextPercent)

      const scenesToComplete = Math.ceil(
        ((mi + 1) / milestones.length) * sceneCount
      )
      for (let si = 0; si < scenesToComplete; si++) {
        markSceneComplete(si)
        const frame =
          input.previewFrames[si] ||
          input.scenes[si]?.imageUrl ||
          ''
        if (frame) revealPreviewFrame(si, frame)
      }

      await delay(stepMs * (0.85 + Math.random() * 0.3))
    }

    if (cap >= 100) {
      for (let si = 0; si < sceneCount; si++) {
        markSceneComplete(si)
        const frame =
          input.previewFrames[si] ||
          input.scenes[si]?.imageUrl ||
          ''
        if (frame) revealPreviewFrame(si, frame)
      }
      setProgress(100)
      await finalizeRender(input.videoUrl ?? null)
    }
  }

  return {
    isComplete,
    isRendering,
    progress,
    startRender: runRenderPipeline,
  }
}
