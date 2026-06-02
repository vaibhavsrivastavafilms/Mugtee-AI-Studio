import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser, parseJsonBody } from '@/lib/cinematic/regen-auth'
import { isVideoRenderEnabled } from '@/lib/cinematic/quick-cut/video-render-enabled'
import {
  loadOwnedCinematicProject,
  projectCanExportReel,
  queueReelExportForProject,
  buildValidatedDownloadResponse,
  mapProjectReelStatus,
} from '@/lib/reels/export-api'
import { resolveProjectScenes } from '@/lib/cinematic-projects'
import {
  findScenesMissingExportImages,
  missingScenesExportMessage,
  VOICE_REQUIRED_EXPORT_MSG,
} from '@/lib/export/scene-export-validation'
import { logError } from '@/lib/workspace/validation'
import { exportLog } from '@/lib/export/export-log.server'
import { friendlyReelRenderErrorFromUnknown } from '@/lib/video/reel-render-errors'
import {
  FeatureUsageFeatures,
  trackFeatureUsage,
} from '@/lib/analytics/feature-usage'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'
import { parseTimelineProject } from '@/types/timeline'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { trackMp4FailedServer } from '@/lib/analytics/mp4-export-track.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  let trackUserId: string | null = null
  let trackProjectId: string | null = null
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response
    trackUserId = auth.user!.id

    if (!isVideoRenderEnabled()) {
      const disabledMsg =
        'Reel MP4 export is not enabled on this server. Set VIDEO_RENDER_ENABLED=true or VIDEO_RENDER_MOCK=true in .env.local.'
      void trackMp4FailedServer({
        userId: trackUserId,
        projectId: null,
        stage: 'validation',
        err: disabledMsg,
        route: 'POST /api/reels/export',
      })
      return NextResponse.json({ error: disabledMsg, status: 'failed' }, { status: 503 })
    }

    const parsed = parseJsonBody(await req.json().catch(() => null))
    if (parsed.response) return parsed.response

    const projectId = String(parsed.body!.projectId || '').trim()
    trackProjectId = projectId || null
    const quality = String(parsed.body!.quality || '1080p').trim()
    const includeVoiceover = parsed.body!.includeVoiceover !== false
    const includeCaptions = parsed.body!.includeCaptions !== false

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    if (quality !== '1080p') {
      return NextResponse.json(
        { error: 'Only 1080p vertical export is supported.' },
        { status: 400 }
      )
    }

    const row = await loadOwnedCinematicProject(projectId, auth.user!.id)
    if (!row) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (row.reel_url?.trim()) {
      return NextResponse.json({
        jobId: null,
        status: 'completed',
        reelUrl: row.reel_url.trim(),
      })
    }

    const validated = await buildValidatedDownloadResponse(row)
    if (validated.status === 'completed' && validated.reelUrl) {
      return NextResponse.json({
        jobId: null,
        status: 'completed',
        reelUrl: validated.reelUrl,
      })
    }

    const inProgressStatuses = new Set([
      'pending',
      'queued',
      'assembling',
      'rendering',
      'uploading',
    ])
    const reelStatus = (row.reel_status ?? '').toLowerCase()
    if (row.reel_job_id?.trim() && inProgressStatuses.has(reelStatus)) {
      return NextResponse.json({
        jobId: row.reel_job_id.trim(),
        status: mapProjectReelStatus(row.reel_status, row.reel_url),
      })
    }

    const renderBlocked = await guardUsageLimit(auth.user!.id, 'renders')
    if (renderBlocked) return renderBlocked

    const timelineOverride = parseTimelineProject(parsed.body!.timelineJson)
    if (timelineOverride) {
      const supabase = createSupabaseServerClient()
      await supabase
        .from('cinematic_projects')
        .update({
          timeline_json: timelineOverride,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .eq('user_id', auth.user!.id)
    }

    if (!projectCanExportReel(row) && !timelineOverride) {
      const missing = findScenesMissingExportImages(resolveProjectScenes(row))
      const voiceUrl = row.voice?.audioUrl?.trim() ?? null
      const validationError =
        missing.length > 0
          ? missingScenesExportMessage(missing)
          : !voiceUrl
            ? VOICE_REQUIRED_EXPORT_MSG
            : 'Add storyboard images and voice narration before exporting a reel.'
      void trackMp4FailedServer({
        userId: auth.user!.id,
        projectId,
        stage: 'validation',
        err: validationError,
        route: 'POST /api/reels/export',
      })
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const { jobId, status } = await queueReelExportForProject({
      row,
      userId: auth.user!.id,
      baseUrl: req.nextUrl.origin,
      includeVoiceover,
      includeCaptions,
    })

    exportLog.requested({
      projectId,
      userId: auth.user!.id,
      jobId,
      quality,
    })

    await trackUsageMetric(auth.user!.id, 'renders')
    void trackFeatureUsage(auth.user!.id, FeatureUsageFeatures.VIDEO_GENERATION, projectId)

    return NextResponse.json({ jobId, status })
  } catch (err) {
    logError('reels.export.post', err)
    const message = friendlyReelRenderErrorFromUnknown(err)
    exportLog.error('export request', err, { route: 'POST /api/reels/export', reason: message })
    if (trackUserId) {
      void trackMp4FailedServer({
        userId: trackUserId,
        projectId: trackProjectId,
        stage: 'queue',
        err,
        route: 'POST /api/reels/export',
      })
    }
    const clientError =
      message.startsWith('Cannot export reel') ||
      message.includes('required before exporting') ||
      message.includes('At least one storyboard') ||
      message.startsWith('Add voiceover')
    return NextResponse.json(
      { error: message, status: 'failed' },
      { status: clientError ? 400 : 500 }
    )
  }
}
