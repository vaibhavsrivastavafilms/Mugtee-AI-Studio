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
import {
  summarizeExportPayload,
  validateExportPayloadStructure,
  validateExportRequestPayload,
} from '@/lib/export/export-schema'
import { mergeClientExportSnapshot } from '@/lib/export/merge-client-export-snapshot.server'
import { collectPayloadMissingAssets } from '@/lib/export/export-payload-assets.server'
import { ensureVoiceExportUrl } from '@/lib/export/voice-export-validation.server'
import { trackMp4FailedServer } from '@/lib/analytics/mp4-export-track.server'
import {
  logPipelineStepComplete,
  logPipelineStepError,
  logPipelineStepStart,
} from '@/lib/cinematic/generation-logger'
import {
  exportApiCheckpoint,
  exportApiFatal,
} from '@/lib/export/export-api-checkpoints.server'
import type { CinematicScene } from '@/stores/cinematic-project'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function isClientExportError(message: string): boolean {
  return (
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
    message.startsWith('Add storyboard') ||
    message.includes('imageUrl or imageAssetPath') ||
    message.includes('unavailable on this server')
  )
}

export async function POST(req: NextRequest) {
  let trackUserId: string | null = null
  let trackProjectId: string | null = null
  try {
    exportApiCheckpoint('request_received')
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

    const validatedBody = validateExportRequestPayload(parsed.body)
    if (!validatedBody.ok) {
      console.error('[EXPORT API] payload_validation_failed', validatedBody.fieldErrors)
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
    const structure = validateExportPayloadStructure(body)
    if (!structure.ok) {
      console.error('[EXPORT API] payload_structure_failed', structure.issues)
      return NextResponse.json(
        {
          success: false,
          code: 'EXPORT_FAILED',
          error: structure.message,
          message: structure.message,
          status: 'failed',
          stage: 'request_validation',
          validation: structure.issues,
        },
        { status: 400 }
      )
    }

    const summary = summarizeExportPayload(body)
    trackProjectId = body.projectId
    console.log('[EXPORT API] payload summary', summary)
    console.table([
      { kind: 'scenes', count: summary.sceneCount },
      { kind: 'storyboards', count: summary.storyboardCount },
      { kind: 'captions', count: summary.captionCount },
    ])
    exportApiCheckpoint('payload_validated', summary)

    const projectId = body.projectId
    let row = await loadOwnedCinematicProject(projectId, auth.user!.id)
    if (!row) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const payloadVoiceUrl = (body.voiceUrl ?? body.voiceover)?.trim() ?? null
    const voiceResolved = await ensureVoiceExportUrl({
      row,
      userId: auth.user!.id,
      includeVoiceover: body.includeVoiceover,
      exportPayloadNarrationUrl: payloadVoiceUrl,
    })
    row = voiceResolved.row

    const payloadMissing = collectPayloadMissingAssets({
      data: body,
      includeVoiceover: body.includeVoiceover,
      resolvedVoiceUrl: payloadVoiceUrl ?? voiceResolved.voiceUrl,
    })
    if (payloadMissing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          code: 'EXPORT_FAILED',
          error: payloadMissing[0]!.message,
          message: payloadMissing[0]!.message,
          status: 'failed',
          stage: 'payload_asset_validation',
          missingAssets: payloadMissing,
        },
        { status: 400 }
      )
    }

    row = mergeClientExportSnapshot(row, {
      ...body,
      voiceUrl: payloadVoiceUrl ?? voiceResolved.voiceUrl ?? body.voiceUrl,
    })
    exportApiCheckpoint('storyboard_processing', { projectId, phase: 'merge_client_snapshot' })

    const quality = body.quality
    const includeVoiceover = body.includeVoiceover
    const includeCaptions = body.includeCaptions

    if (row.reel_url?.trim()) {
      exportApiCheckpoint('completed', { projectId, source: 'existing_reel_url' })
      return NextResponse.json({
        jobId: null,
        status: 'completed',
        reelUrl: row.reel_url.trim(),
      })
    }

    const validated = await buildValidatedDownloadResponse(row)
    if (validated.status === 'completed' && validated.reelUrl) {
      exportApiCheckpoint('completed', { projectId, source: 'validated_download' })
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

    let hydratedScenes: CinematicScene[] | undefined
    if (!timelineOverride) {
      let readiness
      try {
        exportApiCheckpoint('storyboard_processing', { projectId, phase: 'readiness' })
        readiness = await getExportReadinessForProject(row, auth.user!.id, {
          includeVoiceover,
        })
        hydratedScenes = readiness.scenes
        exportApiCheckpoint('image_assets_loaded', {
          projectId,
          sceneCount: readiness.sceneCount,
          imageCount: readiness.imageCount,
        })
      } catch (readinessErr) {
        const rawMessage =
          readinessErr instanceof Error ? readinessErr.message : String(readinessErr)
        exportApiFatal(readinessErr, { projectId, stage: 'readiness_exception' })
        const validationError = friendlyReelRenderErrorFromUnknown(readinessErr)
        void trackMp4FailedServer({
          userId: auth.user!.id,
          projectId,
          stage: 'validation',
          err: readinessErr,
          route: 'POST /api/reels/export',
        })
        return NextResponse.json(
          {
            success: false,
            code: 'EXPORT_FAILED',
            error: rawMessage,
            message: validationError,
            status: 'failed',
            stage: 'storyboard_asset_loading',
            validation: { code: 'readiness_exception', message: validationError },
            stack: readinessErr instanceof Error ? readinessErr.stack : undefined,
          },
          { status: isClientExportError(rawMessage) ? 400 : 500 }
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

    const preQueueScenes = hydratedScenes ?? resolveProjectScenes(row)
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
        hydratedScenes,
      }))
    } catch (queueErr) {
      exportApiFatal(queueErr, { projectId, stage: 'export_queue' })
      throw queueErr
    }

    logPipelineStepComplete('export', projectId, { jobId, status })
    exportApiCheckpoint('completed', { projectId, jobId, status })

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
    const rawMessage = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error && err.stack ? err.stack : undefined
    const friendly = friendlyReelRenderErrorFromUnknown(err)
    exportApiFatal(err, {
      route: 'POST /api/reels/export',
      projectId: trackProjectId,
      userId: trackUserId,
    })
    exportLog.error('export request', err, { route: 'POST /api/reels/export', reason: friendly })
    logPipelineStepError('export', trackProjectId, friendly)
    if (trackUserId) {
      void trackMp4FailedServer({
        userId: trackUserId,
        projectId: trackProjectId,
        stage: 'queue',
        err,
        route: 'POST /api/reels/export',
      })
    }
    const stage =
      rawMessage.includes('storyboard') || rawMessage.includes('Scene')
        ? 'storyboard_asset_loading'
        : rawMessage.includes('voice') || rawMessage.includes('Voice')
          ? 'voice_asset_loading'
          : 'export_queue'
    const httpStatus = isClientExportError(rawMessage) ? 400 : 500
    return NextResponse.json(
      {
        success: false,
        code: 'EXPORT_FAILED',
        error: rawMessage,
        message: friendly,
        status: 'failed',
        stage,
        stack,
      },
      { status: httpStatus }
    )
  }
}
