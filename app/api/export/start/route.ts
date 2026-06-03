import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser, parseJsonBody } from '@/lib/cinematic/regen-auth'
import { isVideoRenderEnabled } from '@/lib/cinematic/quick-cut/video-render-enabled'
import {
  loadOwnedCinematicProject,
  getExportReadinessForProject,
  queueReelExportForProject,
  buildValidatedDownloadResponse,
} from '@/lib/reels/export-api'
import { findActiveExportJobForProject, exportJobToPollResponse } from '@/lib/export/export-job-service'
import { logError } from '@/lib/workspace/validation'
import { friendlyReelRenderErrorFromUnknown } from '@/lib/video/reel-render-errors'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'
import { trackMp4FailedServer } from '@/lib/analytics/mp4-export-track.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Canonical export start — delegates to queueReelExportForProject (same as POST /api/reels/export).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    if (!isVideoRenderEnabled()) {
      return NextResponse.json(
        {
          error:
            'Reel MP4 export is not enabled on this server. Set VIDEO_RENDER_ENABLED=true or VIDEO_RENDER_MOCK=true.',
          status: 'failed',
        },
        { status: 503 }
      )
    }

    const parsed = parseJsonBody(await req.json().catch(() => null))
    if (parsed.response) return parsed.response

    const projectId = String(parsed.body!.projectId || '').trim()
    const includeVoiceover = parsed.body!.includeVoiceover !== false
    const includeCaptions = parsed.body!.includeCaptions !== false

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
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

    const active = await findActiveExportJobForProject(projectId, auth.user!.id)
    if (active) {
      const body = exportJobToPollResponse(active)
      return NextResponse.json({
        jobId: active.id,
        status: body.status,
        resumed: true,
      })
    }

    const renderBlocked = await guardUsageLimit(auth.user!.id, 'renders')
    if (renderBlocked) return renderBlocked

    const readiness = await getExportReadinessForProject(row, auth.user!.id, {
      includeVoiceover,
    })
    if (!readiness.canExport) {
      const validationError =
        readiness.message ??
        'Add storyboard images and voice narration before exporting a reel.'
      void trackMp4FailedServer({
        userId: auth.user!.id,
        projectId,
        stage: 'validation',
        err: validationError,
        route: 'POST /api/export/start',
      })
      return NextResponse.json(
        {
          error: validationError,
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

    const { jobId, status } = await queueReelExportForProject({
      row,
      userId: auth.user!.id,
      baseUrl: req.nextUrl.origin,
      includeVoiceover,
      includeCaptions,
    })

    await trackUsageMetric(auth.user!.id, 'renders')

    return NextResponse.json({ jobId, status })
  } catch (err) {
    logError('export.start.post', err)
    const message = friendlyReelRenderErrorFromUnknown(err)
    return NextResponse.json({ error: message, status: 'failed' }, { status: 500 })
  }
}
