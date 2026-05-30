import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import {
  jobToExportPollResponse,
  loadOwnedCinematicProject,
  mapProjectReelStatus,
} from '@/lib/reels/export-api'
import { getRenderJob } from '@/lib/video/job-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireCinematicUser()
  if (auth.response) return auth.response

  const { jobId } = await context.params
  if (!jobId?.trim()) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 })
  }

  const job = getRenderJob(jobId)
  if (!job) {
    const projectId = req.nextUrl.searchParams.get('projectId')?.trim()
    if (projectId) {
      const row = await loadOwnedCinematicProject(projectId, auth.user!.id)
      if (row) {
        const reelUrl = row.reel_url?.trim() || row.video_url?.trim() || null
        const status = mapProjectReelStatus(row.reel_status, reelUrl)
        const body = {
          status,
          progress: status === 'completed' ? 100 : status === 'failed' ? 0 : 50,
          label:
            status === 'completed'
              ? 'Download ready'
              : status === 'failed'
                ? 'Reel export failed'
                : 'Rendering reel…',
          reelUrl: status === 'completed' ? reelUrl : null,
          error: status === 'failed' ? 'Reel export failed' : null,
        }
        return NextResponse.json(body)
      }
    }
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  if (job.projectId) {
    const row = await loadOwnedCinematicProject(job.projectId, auth.user!.id)
    if (!row) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else if (job.userId && job.userId !== auth.user!.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = jobToExportPollResponse(job)
  return NextResponse.json({
    status: body.status,
    progress: body.progress,
    label: body.label,
    reelUrl: body.reelUrl,
    error: body.error,
  })
}
