import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import {
  jobToExportPollResponse,
  loadOwnedCinematicProject,
} from '@/lib/reels/export-api'
import { getRenderJob } from '@/lib/video/job-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
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
