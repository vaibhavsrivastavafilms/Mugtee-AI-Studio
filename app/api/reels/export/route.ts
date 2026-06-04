import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser, parseJsonBody } from '@/lib/cinematic/regen-auth'
import { resolveProjectScenes } from '@/lib/cinematic-projects'
import { isVideoRenderEnabled } from '@/lib/cinematic/quick-cut/video-render-enabled'
import { logExportAssetCounts } from '@/lib/export/export-readiness.server'
import {
  loadOwnedCinematicProject,
  getExportReadinessForProject,
  queueReelExportForProject,
  buildValidatedDownloadResponse,
} from '@/lib/reels/export-api'
import { findActiveExportJobForProject } from '@/lib/export/export-job-service'
import { exportStatusPollPath } from '@/lib/reels/export-paths'
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
import { validateExportRequestPayload } from '@/lib/export/export-schema'
import { mergeClientExportSnapshot } from '@/lib/export/merge-client-export-snapshot.server'
import { trackMp4FailedServer } from '@/lib/analytics/mp4-export-track.server'
import {
  logPipelineStepComplete,
  logPipelineStepError,
  logPipelineStepStart,
} from '@/lib/cinematic/generation-logger'

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
      return NextResponse.json(
        { success: false, code: 'EXPORT_FAILED', error: disabledMsg, message: disabledMsg, status: 'failed' },
        { status: 503 }
      )
    }

    const rawBody = await req.json().catch(() => null)
    const parsed = parseJsonBody(rawBody)
    if (parsed.response) return parsed.response

    console.log('EXPORT REQUEST')
    console.log(JSON.stringify(parsed.body, null, 2))

    const validatedBody = validateExportRequestPayload(parsed.body)
    if (!validatedBody.ok) {
      console.error(validatedBody.fieldErrors)
      return NextResponse.json(
        {
          success: false,
          code: 'EXPORT_FAILED',
          error: validatedBody.message,
          message: validatedBody.message,
          status: 'failed',
          stage: 'request_validation',
          validation: validatedBody.fieldErrors,
        },
        { status: 400 }
      )
    }

    const body = validatedBody.data
    const projectId = body.projectId
    trackProjectId = projectId
    const quality = body.quality
    const includeVoiceover = body.includeVoiceover
    const includeCaptions = body.includeCaptions

    let row = await loadOwnedCinematicProject(projectId, auth.user!.id)
    if (!row) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    row = mergeClientExportSnapshot(row, body)

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

    const activeExport = await findActiveExportJobForProject(projectId, auth.user!.id)
    if (activeExport) {
      return NextResponse.json({
        jobId: activeExport.id,
        status: activeExport.status,
        pollUrl: exportStatusPollPath(activeExport.id, projectId),
        resumed: true,
      })
    }

    const renderBlocked = await guardUsageLimit(auth.user!.id, 'renders')
    if (renderBlocked) return renderBlocked

    const timelineOverride = parseTimelineProject(body.timelineJson)
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

    if (!timelineOverride) {
      let readiness
      try {
        readiness = await getExportReadinessForProject(row, auth.user!.id, {
          includeVoiceover,
        })
      } catch (readinessErr) {
        const validationError = friendlyReelRenderErrorFromUnknown(readinessErr)
        console.error('[EXPORT_VALIDATION]', {
          projectId,
          stage: 'readiness_exception',
          error: validationError,
          detail: readinessErr instanceof Error ? readinessErr.message : String(readinessErr),
        })
        void trackMp4FailedServer({
          userId: auth.user!.id,
          projectId,
          stage: 'validation',
          err: validationError,
          route: 'POST /api/reels/export',
        })
        return NextResponse.json(
          {
            success: false,
            code: 'EXPORT_FAILED',
            error: validationError,
            message: validationError,
            status: 'failed',
            stage: 'storyboard_asset_loading',
            validation: { code: 'readiness_exception', message: validationError },
          },
          { status: 400 }
        )
      }
      if (!readiness.canExport) {
        const validationError =
          readiness.message ??
          'Add storyboard images and voice narration before exporting a reel.'
        console.error('[EXPORT_VALIDATION]', {
          projectId,
          stage: 'readiness',
          error: validationError,
          missingAssets: readiness.missingAssets,
          imageCount: readiness.imageCount,
          requiredImages: readiness.requiredImages,
          voiceoverCount: readiness.voiceoverCount,
        })
        void trackMp4FailedServer({
          userId: auth.user!.id,
          projectId,
          stage: 'validation',
          err: validationError,
          route: 'POST /api/reels/export',
        })
        return NextResponse.json(
          {
            success: false,
            code: 'EXPORT_FAILED',
            error: validationError,
            message: validationError,
            status: 'failed',
            stage: 'export_readiness',
            validation: {
              code: 'export_readiness',
              canExport: readiness.canExport,
              missingAssets: readiness.missingAssets,
            },
            canExport: readiness.canExport,
            imageCount: readiness.imageCount,
            requiredImages: readiness.requiredImages,
            voiceoverCount: readiness.voiceoverCount,
            assetCount: readiness.assetCount,
            missingAssets: readiness.missingAssets,
          },
          { status: 400 }
        )
      }
    }

    logPipelineStepStart('export', projectId, { quality, includeVoiceover, includeCaptions })

    const preQueueScenes = resolveProjectScenes(row)
    logExportAssetCounts({
      projectId,
      assetCount: 0,
      imageCount: preQueueScenes.filter((s) => s.imageUrl?.trim() || s.imageAssetPath?.trim()).length,
      voiceoverCount: row.voice?.audioUrl?.trim() ? 1 : 0,
      sceneCount: preQueueScenes.length,
      scenes: preQueueScenes,
    })

    let jobId: string
    let status: Awaited<ReturnType<typeof queueReelExportForProject>>['status']
    try {
      ;({ jobId, status } = await queueReelExportForProject({
        row,
        userId: auth.user!.id,
        baseUrl: req.nextUrl.origin,
        includeVoiceover,
        includeCaptions,
      }))
    } catch (queueErr) {
      console.error('[EXPORT_QUEUE]', {
        projectId,
        message:
          queueErr instanceof Error ? queueErr.message : String(queueErr),
        stack: queueErr instanceof Error ? queueErr.stack?.slice(0, 2000) : undefined,
      })
      throw queueErr
    }

    logPipelineStepComplete('export', projectId, { jobId, status })

    exportLog.requested({
      projectId,
      userId: auth.user!.id,
      jobId,
      quality,
    })

    try {
      await trackUsageMetric(auth.user!.id, 'renders')
    } catch (usageErr) {
      console.warn('[EXPORT_USAGE]', usageErr)
    }
    void trackFeatureUsage(auth.user!.id, FeatureUsageFeatures.VIDEO_GENERATION, projectId)

    return NextResponse.json({ jobId, status, success: true })
  } catch (err) {
    logError('reels.export.post', err)
    const message = friendlyReelRenderErrorFromUnknown(err)
    const stack =
      err instanceof Error && err.stack ? err.stack.slice(0, 4000) : undefined
    const errName = err instanceof Error ? err.name : typeof err
    console.error('[EXPORT_FATAL]', err)
    console.error('[EXPORT_FATAL]', {
      route: 'POST /api/reels/export',
      projectId: trackProjectId,
      userId: trackUserId,
      errName,
      message,
      stack,
    })
    exportLog.error('export request', err, { route: 'POST /api/reels/export', reason: message })
    logPipelineStepError('export', trackProjectId, message)
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
      message.includes('Storyboard images are missing or unreachable') ||
      message.includes('missing or unreachable') ||
      message.includes('Missing asset detected') ||
      message.includes('Export assets are missing') ||
      message.includes('missing a storyboard') ||
      message.includes('missing a storyboard image') ||
      message.includes('link may have expired') ||
      message.startsWith('Add voiceover') ||
      message.startsWith('Add storyboard')
    const stage = message.includes('storyboard') || message.includes('Scene')
      ? 'storyboard_asset_loading'
      : message.includes('voice') || message.includes('Voice')
        ? 'voice_asset_loading'
        : 'export_queue'
    const httpStatus = clientError ? 400 : 500
    return NextResponse.json(
      {
        success: false,
        code: 'EXPORT_FAILED',
        error: message,
        message,
        status: 'failed',
        stage,
        ...(httpStatus === 500 ? { stack } : {}),
      },
      { status: httpStatus }
    )
  }
}
