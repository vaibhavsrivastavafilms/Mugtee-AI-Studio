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
import { logError } from '@/lib/workspace/validation'
import { exportLog } from '@/lib/export/export-log.server'
import {
  FeatureUsageFeatures,
  trackFeatureUsage,
} from '@/lib/analytics/feature-usage'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    if (!isVideoRenderEnabled()) {
      return NextResponse.json(
        {
          error:
            'Reel MP4 export is not enabled on this server. Set VIDEO_RENDER_ENABLED=true or VIDEO_RENDER_MOCK=true in .env.local.',
          status: 'failed',
        },
        { status: 503 }
      )
    }

    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const parsed = parseJsonBody(await req.json().catch(() => null))
    if (parsed.response) return parsed.response

    const projectId = String(parsed.body!.projectId || '').trim()
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

    if (!projectCanExportReel(row)) {
      return NextResponse.json(
        {
          error:
            'Add storyboard images and voice narration before exporting a reel.',
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
    exportLog.error('export request', err, { route: 'POST /api/reels/export' })
    const message = err instanceof Error ? err.message : 'Reel export failed'
    return NextResponse.json({ error: message, status: 'failed' }, { status: 500 })
  }
}
