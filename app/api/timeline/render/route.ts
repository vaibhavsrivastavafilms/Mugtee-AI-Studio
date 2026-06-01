import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser, parseJsonBody } from '@/lib/cinematic/regen-auth'
import { isVideoRenderEnabled } from '@/lib/cinematic/quick-cut/video-render-enabled'
import {
  loadOwnedCinematicProject,
  projectCanExportReel,
  mapProjectReelStatus,
  buildValidatedDownloadResponse,
} from '@/lib/reels/export-api'
import { parseTimelineProject } from '@/types/timeline'
import { renderTimelineProject } from '@/lib/timeline/render-timeline-project'
import { createRenderJob, updateRenderJob } from '@/lib/video/job-store'
import { v4 as uuidv4 } from 'uuid'
import { runExportInBackground } from '@/lib/export/export-background.server'
import { updateProjectReelStatus } from '@/lib/video/reel-storage-upload'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logError } from '@/lib/workspace/validation'
import { guardUsageLimit } from '@/lib/usage/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    if (!isVideoRenderEnabled()) {
      return NextResponse.json(
        {
          error:
            'Reel MP4 export is not enabled. Set VIDEO_RENDER_ENABLED=true in .env.local.',
        },
        { status: 503 }
      )
    }

    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const parsed = parseJsonBody(await req.json().catch(() => null))
    if (parsed.response) return parsed.response

    const projectId = String(parsed.body!.projectId || '').trim()
    const timelineRaw = parsed.body!.timelineJson
    const includeVoiceover = parsed.body!.includeVoiceover !== false
    const includeCaptions = parsed.body!.includeCaptions !== false

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    const timelineOverride = parseTimelineProject(timelineRaw)

    const row = await loadOwnedCinematicProject(projectId, auth.user!.id)
    if (!row) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (timelineOverride) {
      const supabase = createSupabaseServerClient()
      await supabase
        .from('cinematic_projects')
        .update({ timeline_json: timelineOverride, updated_at: new Date().toISOString() })
        .eq('id', projectId)
        .eq('user_id', auth.user!.id)
    }

    if (row.reel_url?.trim()) {
      const validated = await buildValidatedDownloadResponse(row)
      if (validated.reelUrl) {
        return NextResponse.json({
          jobId: null,
          status: 'completed',
          reelUrl: validated.reelUrl,
        })
      }
    }

    const renderBlocked = await guardUsageLimit(auth.user!.id, 'renders')
    if (renderBlocked) return renderBlocked

    if (!projectCanExportReel(row) && !timelineOverride) {
      return NextResponse.json(
        { error: 'Add voice and scene images before exporting.' },
        { status: 400 }
      )
    }

    const jobId = `timeline-${uuidv4()}-${Date.now()}`
    createRenderJob(jobId)
    updateRenderJob(jobId, {
      status: 'queued',
      label: 'Queued…',
      percent: 0,
      stage: 'prepare',
      projectId,
      userId: auth.user!.id,
    })

    await updateProjectReelStatus({
      userId: auth.user!.id,
      projectId,
      reelStatus: 'queued',
      reelJobId: jobId,
    }).catch(() => undefined)

    const baseUrl = req.nextUrl.origin

    runExportInBackground(() =>
      renderTimelineProject(projectId, {
        userId: auth.user!.id,
        baseUrl,
        jobId,
        timelineOverride,
        includeVoiceover,
        includeCaptions,
        onProgress: (percent, stage, label) => {
          updateRenderJob(jobId, { percent, stage, label, status: 'running' })
        },
      }).catch((err) => {
        logError('timeline.render.async', err)
        updateRenderJob(jobId, {
          status: 'failed',
          stage: 'error',
          error: err instanceof Error ? err.message : 'Render failed',
          percent: 0,
        })
        void updateProjectReelStatus({
          userId: auth.user!.id,
          projectId,
          reelStatus: 'failed',
          reelJobId: null,
        })
      })
    )

    return NextResponse.json({
      jobId,
      status: mapProjectReelStatus('queued', null),
    })
  } catch (err) {
    logError('timeline.render', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Render failed' },
      { status: 500 }
    )
  }
}
