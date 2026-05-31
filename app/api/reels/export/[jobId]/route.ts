import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import {
  jobToExportPollResponse,
  loadOwnedCinematicProject,
  loadOwnedProjectByReelJobId,
  projectRowToExportPollResponse,
  buildValidatedDownloadResponse,
} from '@/lib/reels/export-api'
import { getRenderJob, touchRenderJobHeartbeat } from '@/lib/video/job-store'
import { exportLog } from '@/lib/export/export-log.server'

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

    touchRenderJobHeartbeat(jobId)
    const body = jobToExportPollResponse(job)
    exportLog.poll({ jobId, source: 'memory', status: body.status, hasUrl: Boolean(body.reelUrl) })
    return NextResponse.json({
      status: body.status,
      progress: body.progress,
      label: body.label,
      reelUrl: body.reelUrl,
      error: body.error,
    })
  }

  const projectId = req.nextUrl.searchParams.get('projectId')?.trim()

  const rowByJob = await loadOwnedProjectByReelJobId(jobId, auth.user!.id)
  if (rowByJob) {
    const validated = await buildValidatedDownloadResponse(rowByJob)
    if (validated.status === 'completed' && validated.reelUrl) {
      const body = {
        status: 'completed' as const,
        progress: 100,
        label: 'Download ready',
        reelUrl: validated.reelUrl,
        error: null,
      }
      exportLog.poll({ jobId, source: 'reel_job_id_completed', status: body.status, hasUrl: true })
      return NextResponse.json(body)
    }
    const body = projectRowToExportPollResponse(rowByJob)
    exportLog.poll({ jobId, source: 'reel_job_id', status: body.status, hasUrl: Boolean(body.reelUrl) })
    return NextResponse.json(body)
  }

  if (projectId) {
    const row = await loadOwnedCinematicProject(projectId, auth.user!.id)
    if (row) {
      const validated = await buildValidatedDownloadResponse(row)
      if (validated.status === 'completed' && validated.reelUrl) {
        exportLog.poll({
          jobId,
          source: 'projectId_completed',
          projectId,
          status: 'completed',
          hasUrl: true,
        })
        return NextResponse.json({
          status: 'completed',
          progress: 100,
          label: 'Download ready',
          reelUrl: validated.reelUrl,
          error: null,
        })
      }
      const body = projectRowToExportPollResponse(row)
      exportLog.poll({ jobId, source: 'projectId', projectId, status: body.status, hasUrl: Boolean(body.reelUrl) })
      return NextResponse.json(body)
    }
  }

  exportLog.error('poll', 'job not found', { jobId, projectId: projectId ?? null })
  return NextResponse.json({ error: 'Job not found' }, { status: 404 })
}
