import 'server-only'

import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { FacelessRenderInput, RenderProgressStage, RenderVideoResult } from '@/lib/video/types'
import type { SceneMotionMap } from '@/lib/motion/motion-presets'
import { createRenderJob, getRenderJob, updateRenderJob } from '@/lib/video/job-store'
import { exportLog } from '@/lib/export/export-log.server'
import { logError } from '@/lib/workspace/validation'
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
import { retryWithBackoff } from '@/lib/video/retry.server'
import { friendlyReelRenderErrorFromUnknown } from '@/lib/video/reel-render-errors'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  assertAllScenesHaveExportImages,
  findScenesMissingExportImages,
  missingScenesExportMessage,
} from '@/lib/export/scene-export-validation'
import { EXPORT_STAGE_LABELS, labelForRenderStage } from '@/lib/reels/export-stages'
import { Mp4ExportEvents } from '@/lib/analytics/mp4-export-events'
import {
  trackMp4ExportServer,
  trackMp4FailedServer,
} from '@/lib/analytics/mp4-export-track.server'
import { syncExportJobFromRenderJob } from '@/lib/export/export-job-service'
import { REEL_BUCKET } from '@/lib/video/reel-storage-upload'

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
  return labelForRenderStage(stage)
}

export async function orchestrateRemotionReel(
  input: FacelessRenderInput,
  options?: {
    jobId?: string
    onProgress?: ReelProgressCallback
    baseUrl?: string
    musicUrl?: string | null
    sceneMotion?: SceneMotionMap | null
    exportStartedAt?: number
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
    const exportStatus =
      stage === 'upload' ? 'uploading' : stage === 'complete' ? 'completed' : 'rendering'
    void syncExportJobFromRenderJob({
      jobId,
      status: exportStatus,
      progress: percent,
      label: friendly,
      stage,
    })
    options?.onProgress?.(percent, stage, friendly)
  }

  try {
    if (!isRemotionRenderAvailable()) {
      throw new Error(
        'Reel render is not enabled. Set VIDEO_RENDER_ENABLED=true on the server.'
      )
    }

    report('prepare', EXPORT_STAGE_LABELS.preparing)

    const scenes = input.scenes.filter((s) => s.description || s.visualPrompt || s.title)
    if (scenes.length < 1) {
      throw new Error('At least one scene is required to render a reel.')
    }

    const missingImages = findScenesMissingExportImages(scenes)
    if (missingImages.length > 0) {
      throw new Error(missingScenesExportMessage(missingImages))
    }
    assertAllScenesHaveExportImages(scenes)

    exportLog.timelineBuilt({
      jobId,
      projectId: input.projectId,
      sceneCount: scenes.length,
    })

    exportLog.renderStarted({
      jobId,
      projectId: input.projectId,
      userId: input.userId,
      sceneCount: scenes.length,
    })

    if (input.userId && input.projectId) {
      await updateProjectReelStatus({
        userId: input.userId,
        projectId: input.projectId,
        reelStatus: 'assembling',
      }).catch(() => undefined)
    }

    const totalDuration = computeRenderTotalSec(scenes)
    const timedScenes = clampSceneDurationsToTarget(scenes, totalDuration)
    const outputPath = path.join(os.tmpdir(), `mugtee-reel-${jobId}.mp4`)

    report('download_assets', EXPORT_STAGE_LABELS.preparing)
    exportLog.voiceLoaded({
      jobId,
      projectId: input.projectId,
      hasVoice: Boolean(input.voiceUrl?.trim()),
    })
    exportLog.imagesLoaded({
      jobId,
      projectId: input.projectId,
      imageCount: scenes.filter((s) => s.imageUrl?.trim()).length,
    })

    if (input.userId && input.projectId) {
      await updateProjectReelStatus({
        userId: input.userId,
        projectId: input.projectId,
        reelStatus: 'rendering',
      }).catch(() => undefined)
    }

    report('render_segments', EXPORT_STAGE_LABELS.timeline)
    exportLog.ffmpegStarted({ jobId, projectId: input.projectId, mock: process.env.VIDEO_RENDER_MOCK === 'true' })

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
        outputPath,
        sceneMotion: options?.sceneMotion ?? null,
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

    report('assemble', EXPORT_STAGE_LABELS.encoding)
    exportLog.ffmpegCompleted({ jobId, projectId: input.projectId, durationSec })
    exportLog.renderComplete({ jobId, projectId: input.projectId, durationSec })

    let videoUrl: string
    let storagePath: string
    let thumbnailUrl: string | null = null

    report('upload', EXPORT_STAGE_LABELS.uploading)
    exportLog.uploadStarted({ jobId, projectId: input.projectId })

    if (input.userId && input.projectId) {
      await updateProjectReelStatus({
        userId: input.userId,
        projectId: input.projectId,
        reelStatus: 'uploading',
      }).catch(() => undefined)
    }

    if (input.userId && input.projectId) {
      const uploaded = await retryWithBackoff(
        () =>
          uploadReelMp4({
            localPath: outputPath,
            projectId: input.projectId!,
            userId: input.userId!,
          }),
        { maxAttempts: 3, label: 'reel upload' }
      )
      videoUrl = uploaded.videoUrl
      storagePath = uploaded.storagePath
      exportLog.uploadComplete({
        jobId,
        projectId: input.projectId,
        storagePath,
      })

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

    report('complete', EXPORT_STAGE_LABELS.ready)
    exportLog.urlGenerated({ jobId, projectId: input.projectId, videoUrl })

    if (input.userId && input.projectId) {
      const processingMs = options?.exportStartedAt
        ? Date.now() - options.exportStartedAt
        : undefined
      void trackMp4ExportServer({
        event: Mp4ExportEvents.MP4_COMPLETED,
        userId: input.userId,
        page: '/api/render/reel',
        metadata: {
          projectId: input.projectId,
          duration_sec: Math.min(durationSec, MAX_VIDEO_DURATION_SEC),
          processing_time_ms: processingMs,
          mock: mock || undefined,
        },
      })
    }

    updateRenderJob(jobId, {
      status: 'done',
      percent: 100,
      stage: 'complete',
      label: 'Download ready',
      videoUrl,
      thumbnailUrl,
      mock,
    })

    void syncExportJobFromRenderJob({
      jobId,
      status: 'completed',
      progress: 100,
      label: 'Download ready',
      stage: 'complete',
      renderUrl: videoUrl,
      storagePath,
      storageBucket: REEL_BUCKET,
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
    const exportError = friendlyReelRenderErrorFromUnknown(err)
    logError('orchestrate.remotion-reel', err)
    const job = getRenderJob(jobId)
    const failStage =
      job?.stage && job.stage !== 'complete' && job.stage !== 'error'
        ? job.stage
        : 'unknown'
    if (input.userId) {
      void trackMp4FailedServer({
        userId: input.userId,
        projectId: input.projectId ?? null,
        stage: failStage,
        err,
        route: 'orchestrateRemotionReel',
      })
    }
    exportLog.error('render', err, { jobId, projectId: input.projectId, reason: exportError })

    if (input.userId && input.projectId) {
      await updateProjectReelStatus({
        userId: input.userId,
        projectId: input.projectId,
        reelStatus: 'failed',
        reelJobId: null,
      }).catch(() => undefined)
      void createSupabaseServerClient()
        .from('cinematic_projects')
        .update({
          generation_error: exportError.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.projectId)
        .eq('user_id', input.userId)
        .then(() => undefined)
        .catch(() => undefined)
    }

    updateRenderJob(jobId, {
      status: 'failed',
      stage: 'error',
      label: message.slice(0, 120),
      error: message,
      percent: 0,
    })
    void syncExportJobFromRenderJob({
      jobId,
      status: 'failed',
      progress: 0,
      label: message.slice(0, 120),
      stage: 'error',
      error: exportError,
    })
    throw err
  }
}
