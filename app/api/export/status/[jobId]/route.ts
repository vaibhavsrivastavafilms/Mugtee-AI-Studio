import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import {
  exportJobToPollResponse,
  getExportJob,
} from '@/lib/export/export-job-service'
import {
  jobToExportPollResponse,
  loadOwnedCinematicProject,
  buildValidatedDownloadResponse,
} from '@/lib/reels/export-api'
import { getRenderJob, touchRenderJobHeartbeat } from '@/lib/video/job-store'
import { exportLog } from '@/lib/export/export-log.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Durable export status — prefers export_jobs, falls back to ephemeral job-store.
 */
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

  const exportRow = await getExportJob(jobId.trim(), auth.user!.id)
  if (exportRow) {
    const body = exportJobToPollResponse(exportRow)
    exportLog.poll({ jobId, source: 'export_jobs', status: body.status, hasUrl: Boolean(body.reelUrl) })
    return NextResponse.json({
      status: body.status,
      progress: body.progress,
      label: body.label,
      reelUrl: body.reelUrl,
      error: body.error,
      jobId: body.jobId,
    })
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
    exportLog.poll({ jobId, source: 'memory_fallback', status: body.status, hasUrl: Boolean(body.reelUrl) })
    return NextResponse.json({
      status: body.status,
      progress: body.progress,
      label: body.label,
      reelUrl: body.reelUrl,
      error: body.error,
      jobId: body.jobId,
    })
  }

  const projectId = _req.nextUrl.searchParams.get('projectId')?.trim()
  if (projectId) {
    const row = await loadOwnedCinematicProject(projectId, auth.user!.id)
    if (row?.reel_job_id === jobId) {
      const validated = await buildValidatedDownloadResponse(row)
      if (validated.status === 'completed' && validated.reelUrl) {
        return NextResponse.json({
          status: 'completed',
          progress: 100,
          label: 'Download ready',
          reelUrl: validated.reelUrl,
          error: null,
          jobId,
        })
      }
    }
  }

  exportLog.error('export.status', 'job not found', { jobId })
  return NextResponse.json({ error: 'Job not found' }, { status: 404 })
}
