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
import { isValidReelDownloadUrl } from '@/lib/export/reel-url-validation'
import { verifyReelFileExists } from '@/lib/export/reel-url-validation.server'
import { logError } from '@/lib/workspace/validation'

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
  switch (status) {
    case 'queued':
      return 'Queued…'
    case 'rendering':
      if (job?.stage === 'prepare' || job?.stage === 'download_assets') {
        return 'Assembling film…'
      }
      return 'Rendering reel…'
    case 'uploading':
      return 'Uploading reel…'
    case 'completed':
      return 'Download ready'
    case 'failed':
      return job?.error || 'Reel export failed'
    default:
      return 'Preparing export…'
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
  if (scene.imageUrl?.trim()) return scene.imageUrl.trim()
  const active = scene.storyboardImages?.find(
    (img) => img.id === scene.activeStoryboardId
  )?.url
  if (active?.trim()) return active.trim()
  const first = scene.storyboardImages?.[0]?.url
  return first?.trim() ? first.trim() : null
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
  return scenes.some((scene) => Boolean(resolvePersistedSceneImageUrl(scene)))
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
  const status = mapProjectReelStatus(row.reel_status, reelUrl)
  const completed = status === 'completed' && Boolean(reelUrl?.trim())
  return {
    status: completed ? 'completed' : status,
    progress: completed ? 100 : status === 'failed' ? 0 : 50,
    label:
      completed
        ? 'Download ready'
        : status === 'failed'
          ? 'Reel export failed'
          : status === 'uploading'
            ? 'Uploading reel…'
            : 'Rendering reel…',
    reelUrl: completed ? reelUrl : null,
    error: status === 'failed' ? 'Reel export failed' : null,
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
    return {
      status: 'uploading',
      reelUrl,
      renderedAt,
      validated: false,
      validationError: verification.error ?? 'file unreachable',
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
  const raw = err instanceof Error ? err.message : 'Reel export failed'
  if (raw.includes('VIDEO_RENDER') || raw.includes('Remotion') || raw.includes('FFmpeg')) {
    return 'Reel export is temporarily unavailable — your preview still works.'
  }
  return raw.slice(0, 160)
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

  const voiceUrl = params.includeVoiceover
    ? params.row.voice?.audioUrl?.trim() ?? null
    : null

  if (params.includeVoiceover && !voiceUrl) {
    throw new Error('Voice narration is required before exporting a reel.')
  }

  const jobId = `reel-${uuidv4()}-${Date.now()}`
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

  void orchestrateRemotionReel(input, {
    jobId,
    baseUrl: params.baseUrl,
    musicUrl: null,
    sceneMotion: parseSceneMotionMap(params.row.scene_motion),
  }).catch((err) => {
    logError('reels.export.async', err)
    updateRenderJob(jobId, {
      status: 'failed',
      stage: 'error',
      label: friendlyExportError(err),
      error: friendlyExportError(err),
      percent: 0,
    })
    void updateProjectReelStatus({
      userId: params.userId,
      projectId: params.row.id,
      reelStatus: 'failed',
      reelJobId: null,
    }).catch(() => undefined)
  })

  return { jobId, status: 'queued' }
}
