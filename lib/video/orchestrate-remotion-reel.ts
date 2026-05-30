import 'server-only'

import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { FacelessRenderInput, RenderProgressStage, RenderVideoResult } from '@/lib/video/types'
import { createRenderJob, getRenderJob, updateRenderJob } from '@/lib/video/job-store'
import { logError } from '@/lib/workspace/validation'
import { buildSubtitleSegmentsFromScenes } from '@/lib/video/subtitles'
import {
  clampSceneDurationsToTarget,
  computeRenderTotalSec,
} from '@/lib/cinematic/scene-duration'
import { MAX_VIDEO_DURATION_SEC } from '@/lib/workspace/validation'
import { saveLocalRenderAsset } from '@/lib/video/storage-upload'
import {
  persistProjectReel,
  updateProjectReelStatus,
  uploadReelMp4,
} from '@/lib/video/reel-storage-upload'
import {
  isRemotionRenderAvailable,
  renderRemotionReel,
  renderRemotionReelMock,
} from '@/lib/remotion/render-reel.server'

export type ReelProgressCallback = (
  percent: number,
  stage: RenderProgressStage,
  label: string
) => void

const STAGE_PERCENT: Record<RenderProgressStage, number> = {
  prepare: 8,
  download_assets: 22,
  render_segments: 55,
  assemble: 82,
  upload: 94,
  complete: 100,
  error: 0,
}

export function reelStageLabel(stage: RenderProgressStage): string {
  switch (stage) {
    case 'prepare':
    case 'download_assets':
      return 'Assembling film…'
    case 'render_segments':
    case 'assemble':
      return 'Rendering reel…'
    case 'upload':
      return 'Uploading reel…'
    case 'complete':
      return 'Download ready'
    default:
      return 'Processing…'
  }
}

export async function orchestrateRemotionReel(
  input: FacelessRenderInput,
  options?: {
    jobId?: string
    onProgress?: ReelProgressCallback
    baseUrl?: string
    musicUrl?: string | null
  }
): Promise<RenderVideoResult> {
  const jobId = options?.jobId ?? `reel-${uuidv4()}-${Date.now()}`
  if (!getRenderJob(jobId)) {
    createRenderJob(jobId)
  }

  const report = (stage: RenderProgressStage, label?: string) => {
    const friendly = label ?? reelStageLabel(stage)
    const percent = STAGE_PERCENT[stage]
    updateRenderJob(jobId, { percent, stage, label: friendly, status: 'running' })
    options?.onProgress?.(percent, stage, friendly)
  }

  try {
    if (!isRemotionRenderAvailable()) {
      throw new Error(
        'Reel render is not enabled. Set VIDEO_RENDER_ENABLED=true on the server.'
      )
    }

    report('prepare')

    const scenes = input.scenes.filter((s) => s.description || s.visualPrompt || s.title)
    if (scenes.length < 1) {
      throw new Error('At least one scene is required to render a reel.')
    }

    if (input.userId && input.projectId) {
      await updateProjectReelStatus({
        userId: input.userId,
        projectId: input.projectId,
        reelStatus: 'assembling',
      }).catch(() => undefined)
    }

    const totalDuration = computeRenderTotalSec(scenes)
    const timedScenes = clampSceneDurationsToTarget(scenes, totalDuration)
    const subtitles = buildSubtitleSegmentsFromScenes(timedScenes, totalDuration)
    const outputPath = path.join(os.tmpdir(), `mugtee-reel-${jobId}.mp4`)

    report('download_assets')

    if (input.userId && input.projectId) {
      await updateProjectReelStatus({
        userId: input.userId,
        projectId: input.projectId,
        reelStatus: 'rendering',
      }).catch(() => undefined)
    }

    report('render_segments')

    const mock = process.env.VIDEO_RENDER_MOCK === 'true'
    let durationSec = 0
    let thumbnailPath: string | null = null

    if (mock) {
      const mockResult = await renderRemotionReelMock({ outputPath, durationSec: totalDuration })
      durationSec = mockResult.durationSec
      thumbnailPath = mockResult.thumbnailPath
    } else {
      const renderResult = await renderRemotionReel({
        scenes: timedScenes,
        voiceUrl: input.voiceUrl,
        musicUrl: options?.musicUrl ?? null,
        title: input.title,
        subtitles,
        outputPath,
        onProgress: (label, percent) => {
          updateRenderJob(jobId, {
            percent,
            stage: 'render_segments',
            label,
            status: 'running',
          })
        },
      })
      durationSec = renderResult.durationSec
      thumbnailPath = renderResult.thumbnailPath
    }

    report('assemble', 'Finalizing reel…')

    let videoUrl: string
    let storagePath: string
    let thumbnailUrl: string | null = null

    report('upload')

    if (input.userId && input.projectId) {
      await updateProjectReelStatus({
        userId: input.userId,
        projectId: input.projectId,
        reelStatus: 'uploading',
      }).catch(() => undefined)
    }

    if (input.userId && input.projectId) {
      const uploaded = await uploadReelMp4({
        localPath: outputPath,
        projectId: input.projectId,
        userId: input.userId,
      })
      videoUrl = uploaded.videoUrl
      storagePath = uploaded.storagePath

      if (thumbnailPath) {
        try {
          const thumbBuf = await fs.readFile(thumbnailPath)
          const { createSupabaseServerClient } = await import('@/lib/supabase/server')
          const supabase = createSupabaseServerClient()
          const thumbStorage = `${input.projectId}/reel-thumb.jpg`
          await supabase.storage.from('reels').upload(thumbStorage, thumbBuf, {
            contentType: 'image/jpeg',
            upsert: true,
          })
          const { data: pub } = supabase.storage.from('reels').getPublicUrl(thumbStorage)
          thumbnailUrl = pub.publicUrl
        } catch {
          /* optional thumbnail */
        }
      }

      await persistProjectReel({
        userId: input.userId,
        projectId: input.projectId,
        videoUrl,
        storagePath,
        title: input.title,
        thumbnailUrl,
        reelStatus: 'ready',
      })
    } else {
      const local = await saveLocalRenderAsset({ localPath: outputPath, jobId })
      videoUrl = local.videoUrl
      storagePath = local.storagePath
      if (options?.baseUrl && videoUrl.startsWith('/')) {
        videoUrl = `${options.baseUrl.replace(/\/$/, '')}${videoUrl}`
      }
    }

    await fs.unlink(outputPath).catch(() => undefined)

    report('complete', 'Download ready')

    updateRenderJob(jobId, {
      status: 'done',
      percent: 100,
      stage: 'complete',
      label: 'Download ready',
      videoUrl,
      thumbnailUrl,
      mock,
    })

    return {
      videoUrl,
      thumbnailUrl,
      status: 'ready',
      durationSec: Math.min(durationSec, MAX_VIDEO_DURATION_SEC),
      mock: mock || undefined,
      provider: 'remotion',
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Reel render failed — preview is still available.'
    logError('orchestrate.remotion-reel', err)

    if (input.userId && input.projectId) {
      await updateProjectReelStatus({
        userId: input.userId,
        projectId: input.projectId,
        reelStatus: 'failed',
        reelJobId: null,
      }).catch(() => undefined)
    }

    updateRenderJob(jobId, {
      status: 'failed',
      stage: 'error',
      label: 'Reel render unavailable — use preview instead',
      error: message,
      percent: 0,
    })
    throw err
  }
}
