import 'server-only'

import { v4 as uuidv4 } from 'uuid'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { storeScenesToGenerated } from '@/lib/cinematic/generation'
import {
  resolveProjectScenes,
  type CinematicProjectRow,
} from '@/lib/cinematic-projects'
import type { CinematicScene } from '@/stores/cinematic-project'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { RenderJobStatus } from '@/lib/video/types'
import { createRenderJob, getRenderJob, updateRenderJob } from '@/lib/video/job-store'
import { parseSceneMotionMap } from '@/lib/motion/motion-presets'
import { orchestrateRemotionReel } from '@/lib/video/orchestrate-remotion-reel'
import { updateProjectReelStatus } from '@/lib/video/reel-storage-upload'
import { exportLog } from '@/lib/export/export-log.server'
import { runExportInBackground } from '@/lib/export/export-background.server'
import { validateExportAssets } from '@/lib/export/asset-validation.server'
import {
  allScenesHaveExportImages,
  missingScenesExportMessage,
  resolveSceneExportImageUrl,
  findScenesMissingExportImages,
  VOICE_REQUIRED_EXPORT_MSG,
} from '@/lib/export/scene-export-validation'
import {
  recordExportMetricFailure,
  recordExportMetricSuccess,
} from '@/lib/export/export-metrics.server'
import {
  EXPORT_STAGE_LABELS,
  labelForRenderStage,
  REEL_STATUS_PROGRESS,
} from '@/lib/reels/export-stages'
import { isValidReelDownloadUrl } from '@/lib/export/reel-url-validation'
import { verifyReelFileExists } from '@/lib/export/reel-url-validation.server'
import { logError } from '@/lib/workspace/validation'
import { friendlyReelRenderErrorFromUnknown } from '@/lib/video/reel-render-errors'

export type ReelExportStatus =
  | 'pending'
  | 'queued'
  | 'rendering'
  | 'uploading'
  | 'completed'
  | 'failed'

export type ReelExportRequest = {
  projectId: string
  quality?: string
  includeVoiceover?: boolean
  includeCaptions?: boolean
}

export { reelExportPollPath } from '@/lib/reels/export-paths'

export function mapJobToExportStatus(job: RenderJobStatus): ReelExportStatus {
  if (job.status === 'failed') return 'failed'
  if (job.status === 'done') return 'completed'
  if (job.status === 'queued') return 'queued'
  if (job.stage === 'upload') return 'uploading'
  if (job.stage === 'prepare' || job.stage === 'download_assets') return 'rendering'
  return 'rendering'
}

export function exportStatusLabel(status: ReelExportStatus, job?: RenderJobStatus): string {
  if (job?.label?.trim()) return job.label.trim()
  if (job?.stage) return labelForRenderStage(job.stage)
  switch (status) {
    case 'queued':
      return EXPORT_STAGE_LABELS.queued
    case 'rendering':
      return EXPORT_STAGE_LABELS.encoding
    case 'uploading':
      return EXPORT_STAGE_LABELS.uploading
    case 'completed':
      return EXPORT_STAGE_LABELS.ready
    case 'failed':
      return job?.error || EXPORT_STAGE_LABELS.failed
    default:
      return EXPORT_STAGE_LABELS.preparing
  }
}

export function mapProjectReelStatus(
  reelStatus: string | null | undefined,
  reelUrl: string | null | undefined
): ReelExportStatus {
  if (reelUrl?.trim() && isValidReelDownloadUrl(reelUrl)) return 'completed'
  const s = (reelStatus ?? '').toLowerCase()
  if (s === 'ready' || s === 'completed') return 'uploading'
  if (s === 'failed') return 'failed'
  if (s === 'queued' || s === 'pending') return s as ReelExportStatus
  if (s === 'uploading') return 'uploading'
  if (s === 'assembling' || s === 'rendering') return 'rendering'
  return 'pending'
}

function resolvePersistedSceneImageUrl(scene: CinematicScene): string | null {
  return resolveSceneExportImageUrl(scene)
}

export function scenesForReelExport(scenes: CinematicScene[]): GeneratedScene[] {
  const withImages = scenes.map((scene) => {
    const imageUrl = resolvePersistedSceneImageUrl(scene)
    return imageUrl ? { ...scene, imageUrl } : scene
  })
  return storeScenesToGenerated(withImages)
}

export function projectCanExportReel(row: CinematicProjectRow): boolean {
  const voiceUrl = row.voice?.audioUrl?.trim() ?? null
  const scenes = resolveProjectScenes(row)
  if (scenes.length < 1) return false
  if (!voiceUrl) return false
  return allScenesHaveExportImages(scenes)
}

export async function loadOwnedCinematicProject(
  projectId: string,
  userId: string
): Promise<CinematicProjectRow | null> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('cinematic_projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  return data as CinematicProjectRow
}

/** Serverless poll fallback when in-memory render jobs are lost between requests. */
export async function loadOwnedProjectByReelJobId(
  reelJobId: string,
  userId: string
): Promise<CinematicProjectRow | null> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('cinematic_projects')
    .select('*')
    .eq('reel_job_id', reelJobId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  return data as CinematicProjectRow
}

export function projectRowToExportPollResponse(row: CinematicProjectRow) {
  const reelUrl = row.reel_url?.trim() || row.video_url?.trim() || null
  const hasValidUrl = Boolean(reelUrl && isValidReelDownloadUrl(reelUrl))
  const status = mapProjectReelStatus(row.reel_status, reelUrl)
  const completed = hasValidUrl && (status === 'completed' || !row.reel_job_id?.trim())
  const reelKey = (row.reel_status ?? '').toLowerCase()
  const stageInfo = REEL_STATUS_PROGRESS[reelKey]
  const failureMessage =
    status === 'failed' ? row.generation_error?.trim() || EXPORT_STAGE_LABELS.failed : null
  return {
    status: completed ? 'completed' : status,
    progress: completed ? 100 : stageInfo?.progress ?? (status === 'failed' ? 0 : 35),
    label: completed
      ? EXPORT_STAGE_LABELS.ready
      : status === 'failed'
        ? failureMessage ?? EXPORT_STAGE_LABELS.failed
        : stageInfo?.label ?? EXPORT_STAGE_LABELS.encoding,
    reelUrl: completed ? reelUrl : null,
    error: failureMessage,
  }
}

export function jobToExportPollResponse(job: RenderJobStatus) {
  let status = mapJobToExportStatus(job)
  const reelUrl =
    status === 'completed' && job.videoUrl?.trim() && isValidReelDownloadUrl(job.videoUrl)
      ? job.videoUrl.trim()
      : null
  if (status === 'completed' && !reelUrl) {
    status = job.stage === 'upload' ? 'uploading' : 'rendering'
  }
  return {
    jobId: job.jobId,
    status,
    progress: Math.round(job.percent),
    label: exportStatusLabel(status, job),
    reelUrl,
    error: job.error,
  }
}

export async function buildValidatedDownloadResponse(
  row: CinematicProjectRow
): Promise<{
  status: ReelExportStatus
  reelUrl: string | null
  renderedAt: string | null
  validated: boolean
  fileSize?: number
  validationError?: string | null
}> {
  const reelUrl = row.reel_url?.trim() || row.video_url?.trim() || null
  const status = mapProjectReelStatus(row.reel_status, reelUrl)
  const renderedAt = row.reel_rendered_at ?? null

  if (status !== 'completed' || !reelUrl) {
    return {
      status,
      reelUrl: reelUrl ?? null,
      renderedAt,
      validated: false,
      validationError: reelUrl && !isValidReelDownloadUrl(reelUrl) ? 'invalid url' : null,
    }
  }

  const verification = await verifyReelFileExists(reelUrl, row.id)
  if (!verification.ok) {
    exportLog.error('download validate', verification.error ?? 'unreachable', {
      projectId: row.id,
      reelUrl,
    })
    const sameOriginPath = `/api/reels/download/${encodeURIComponent(row.id)}/file`
    return {
      status: 'completed',
      reelUrl: sameOriginPath,
      renderedAt,
      validated: true,
      validationError: null,
    }
  }

  return {
    status: 'completed',
    reelUrl,
    renderedAt,
    validated: true,
    fileSize: verification.size,
    validationError: null,
  }
}

function friendlyExportError(err: unknown): string {
  return friendlyReelRenderErrorFromUnknown(err)
}

export async function queueReelExportForProject(params: {
  row: CinematicProjectRow
  userId: string
  baseUrl: string
  includeVoiceover: boolean
  includeCaptions: boolean
}): Promise<{ jobId: string; status: ReelExportStatus }> {
  const scenes = scenesForReelExport(resolveProjectScenes(params.row))
  if (scenes.length < 1) {
    throw new Error('At least one storyboard scene is required.')
  }

  const missingImages = findScenesMissingExportImages(resolveProjectScenes(params.row))
  if (missingImages.length > 0) {
    throw new Error(missingScenesExportMessage(missingImages))
  }

  const voiceUrl = params.includeVoiceover
    ? params.row.voice?.audioUrl?.trim() ?? null
    : null

  if (params.includeVoiceover && !voiceUrl) {
    throw new Error(VOICE_REQUIRED_EXPORT_MSG)
  }

  const jobId = `reel-${uuidv4()}-${Date.now()}`
  const exportStartedAt = Date.now()
  exportLog.exportStart({
    projectId: params.row.id,
    userId: params.userId,
    jobId,
    includeVoiceover: params.includeVoiceover,
    includeCaptions: params.includeCaptions,
  })

  const validation = await validateExportAssets({
    row: params.row,
    includeVoiceover: params.includeVoiceover,
    includeCaptions: params.includeCaptions,
  })
  exportLog.assetValidation({
    jobId,
    projectId: params.row.id,
    ...validation,
  })
  if (!validation.valid) {
    throw new Error(validation.message ?? 'Export assets are missing or unreachable.')
  }

  exportLog.requested({
    projectId: params.row.id,
    userId: params.userId,
    jobId,
    includeVoiceover: params.includeVoiceover,
    includeCaptions: params.includeCaptions,
  })
  createRenderJob(jobId)
  updateRenderJob(jobId, {
    status: 'queued',
    label: 'Queued…',
    percent: 0,
    stage: 'prepare',
    projectId: params.row.id,
    userId: params.userId,
  })

  await updateProjectReelStatus({
    userId: params.userId,
    projectId: params.row.id,
    reelStatus: 'queued',
    reelJobId: jobId,
  }).catch(() => undefined)

  void createSupabaseServerClient()
    .from('cinematic_projects')
    .update({
      generation_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.row.id)
    .eq('user_id', params.userId)
    .then(() => undefined)
    .catch(() => undefined)

  const input = {
    idea: params.row.prompt || params.row.title || 'cinematic-story',
    title: params.row.title || 'Untitled reel',
    script: params.row.script || '',
    scenes,
    voiceAudioPath: null,
    voiceUrl,
    subtitles: params.includeCaptions ? [] : [],
    userId: params.userId,
    projectId: params.row.id,
  }

  runExportInBackground(() =>
    orchestrateRemotionReel(input, {
      jobId,
      baseUrl: params.baseUrl,
      musicUrl: null,
      sceneMotion: parseSceneMotionMap(params.row.scene_motion),
      exportStartedAt,
    })
      .then(() => {
        recordExportMetricSuccess(Date.now() - exportStartedAt)
      })
      .catch((err) => {
        logError('reels.export.async', err)
        recordExportMetricFailure()
        const exportError = friendlyExportError(err)
        exportLog.error('async export', err, {
          jobId,
          projectId: params.row.id,
          userId: params.userId,
          reason: exportError,
        })
        updateRenderJob(jobId, {
          status: 'failed',
          stage: 'error',
          label: exportError,
          error: exportError,
          percent: 0,
        })
        void createSupabaseServerClient()
          .from('cinematic_projects')
          .update({
            generation_error: exportError.slice(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.row.id)
          .eq('user_id', params.userId)
          .then(() => undefined)
          .catch(() => undefined)
        void updateProjectReelStatus({
          userId: params.userId,
          projectId: params.row.id,
          reelStatus: 'failed',
          reelJobId: null,
        }).catch(() => undefined)
      })
  )

  return { jobId, status: 'queued' }
}
