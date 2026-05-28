import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { FacelessRenderInput, RenderProgressStage, RenderVideoResult } from '@/lib/video/types'
import { isFfmpegAvailable } from '@/lib/video/ffmpeg-path.server'
import { createRenderJob, getRenderJob, updateRenderJob } from '@/lib/video/job-store'
import { renderFacelessMp4 } from '@/lib/video/render-pipeline'
import { buildSubtitleSegmentsFromScenes } from '@/lib/video/subtitles'
import { downloadToFile, ensureDir, extFromUrl } from '@/lib/video/download-asset'
import {
  persistProjectVideo,
  saveLocalRenderAsset,
  uploadRenderMp4,
} from '@/lib/video/storage-upload'

export type ProgressCallback = (percent: number, stage: RenderProgressStage, label: string) => void

const STAGE_PERCENT: Record<RenderProgressStage, number> = {
  prepare: 10,
  download_assets: 30,
  render_segments: 55,
  assemble: 75,
  upload: 95,
  complete: 100,
  error: 0,
}

function sceneImageUrl(scene: GeneratedScene): string | null {
  if (scene.imageUrl?.trim()) return scene.imageUrl.trim()
  return null
}

function placeholderImage(seed: string): string {
  const q = encodeURIComponent(seed.slice(0, 80) || 'cinematic')
  return `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&h=1920&fit=crop&q=80&auto=format&sig=${q}`
}

export async function orchestrateFacelessVideo(
  input: FacelessRenderInput,
  options?: {
    jobId?: string
    onProgress?: ProgressCallback
    baseUrl?: string
  }
): Promise<RenderVideoResult> {
  const jobId = options?.jobId ?? `render-${uuidv4()}-${Date.now()}`
  if (!getRenderJob(jobId)) {
    createRenderJob(jobId)
  }

  const report = (stage: RenderProgressStage, label: string) => {
    const percent = STAGE_PERCENT[stage]
    updateRenderJob(jobId, { percent, stage, label, status: 'running' })
    options?.onProgress?.(percent, stage, label)
  }

  try {
    if (!isFfmpegAvailable()) {
      throw new Error(
        'Video compile requires FFmpeg on the server. Use local dev (ffmpeg-static) or set VIDEO_RENDER_MOCK=true for a test render only.'
      )
    }

    report('prepare', 'Preparing cinematic assembly…')

    const scenes = input.scenes.filter(
      (s) => s.description || s.visualPrompt || s.title
    )
    if (scenes.length < 1) {
      throw new Error('At least one scene is required to compile video.')
    }

    const totalDuration = Math.min(
      60,
      Math.max(30, scenes.reduce((sum, s) => sum + Math.max(2, s.duration || 4), 0))
    )

    const renderScenes = scenes.map((scene, i) => ({
      id: scene.id || `scene-${i}`,
      imageUrl: sceneImageUrl(scene) ?? placeholderImage(scene.visualPrompt || scene.title),
      durationSec: Math.max(2, scene.duration || 4),
      title: scene.title,
    }))

    report('download_assets', 'Downloading scene visuals & voice…')

    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mugtee-orch-'))
    let audioPath: string | null = input.voiceAudioPath

    if (!audioPath && input.voiceUrl) {
      const ext = extFromUrl(input.voiceUrl, '.mp3')
      audioPath = path.join(workDir, `narration${ext}`)
      await downloadToFile(input.voiceUrl, audioPath)
    }

    const subtitles = buildSubtitleSegmentsFromScenes(scenes, totalDuration)
    const outputPath = path.join(os.tmpdir(), `mugtee-${jobId}.mp4`)

    report('render_segments', 'Rendering 9:16 cinematic frames…')

    const { durationSec, thumbnailPath } = await renderFacelessMp4({
      scenes: renderScenes,
      audioPath,
      subtitles,
      outputPath,
      crossfadeSec: 0.35,
    })

    report('assemble', 'Finalizing MP4…')

    let videoUrl: string
    let storagePath: string
    let thumbnailUrl: string | null = null
    const mock = process.env.VIDEO_RENDER_MOCK === 'true'

    report('upload', 'Uploading to storage…')

    if (input.userId) {
      const uploaded = await uploadRenderMp4({
        localPath: outputPath,
        userId: input.userId,
        jobId,
        projectId: input.projectId,
      })
      videoUrl = uploaded.videoUrl
      storagePath = uploaded.storagePath

      if (thumbnailPath) {
        const thumbBuf = await fs.readFile(thumbnailPath)
        const { createSupabaseServerClient } = await import('@/lib/supabase/server')
        const supabase = createSupabaseServerClient()
        const thumbStorage = `${input.userId}/renders/${jobId}_thumb.jpg`
        await supabase.storage.from('project-assets').upload(thumbStorage, thumbBuf, {
          contentType: 'image/jpeg',
          upsert: true,
        })
        const { data: pub } = supabase.storage.from('project-assets').getPublicUrl(thumbStorage)
        thumbnailUrl = pub.publicUrl
      }

      if (input.projectId) {
        await persistProjectVideo({
          userId: input.userId,
          projectId: input.projectId,
          videoUrl,
          storagePath,
          title: input.title,
          thumbnailUrl,
        })
      }
    } else {
      const local = await saveLocalRenderAsset({ localPath: outputPath, jobId })
      videoUrl = local.videoUrl
      storagePath = local.storagePath
      if (options?.baseUrl && videoUrl.startsWith('/')) {
        videoUrl = `${options.baseUrl.replace(/\/$/, '')}${videoUrl}`
      }
    }

    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined)
    await fs.unlink(outputPath).catch(() => undefined)

    report('complete', 'Your cinematic video is ready')

    updateRenderJob(jobId, {
      status: 'done',
      percent: 100,
      stage: 'complete',
      label: 'Complete',
      videoUrl,
      thumbnailUrl,
      mock,
    })

    return {
      videoUrl,
      thumbnailUrl,
      status: 'ready',
      durationSec,
      mock: mock || undefined,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Video render failed'
    updateRenderJob(jobId, {
      status: 'failed',
      stage: 'error',
      label: message,
      error: message,
      percent: 0,
    })
    throw err
  }
}
