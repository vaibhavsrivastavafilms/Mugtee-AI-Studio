import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import {
  jobToExportPollResponse,
  loadOwnedCinematicProject,
  loadOwnedProjectByReelJobId,
  projectRowToExportPollResponse,
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
  if (job) {
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

  const rowByJob = await loadOwnedProjectByReelJobId(jobId, auth.user!.id)
  if (rowByJob) {
    return NextResponse.json(projectRowToExportPollResponse(rowByJob))
  }

  const projectId = req.nextUrl.searchParams.get('projectId')?.trim()
  if (projectId) {
    const row = await loadOwnedCinematicProject(projectId, auth.user!.id)
    if (row) {
      return NextResponse.json(projectRowToExportPollResponse(row))
    }
  }

  return NextResponse.json({ error: 'Job not found' }, { status: 404 })
}
