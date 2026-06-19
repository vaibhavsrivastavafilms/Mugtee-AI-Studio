import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import {
  exportJobToPollResponse,
  getExportJob,
  syncExportJobFromRenderJob,
} from '@/lib/export/export-job-service'
import {
  jobToExportPollResponse,
  loadOwnedCinematicProject,
  buildValidatedDownloadResponse,
} from '@/lib/reels/export-api'
import { getRenderJob, touchRenderJobHeartbeat } from '@/lib/video/job-store'
import { exportLog } from '@/lib/export/export-log.server'
import {
  logJobStatusTransition,
  logRenderJobTrace,
  renderJobTraceFromStatus,
} from '@/lib/export/render-job-trace.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ACTIVE_EXPORT_JOB_STATUSES = new Set(['pending', 'queued', 'rendering', 'uploading'])

function authorizeMemoryJob(
  job: NonNullable<ReturnType<typeof getRenderJob>>,
  userId: string,
  projectId: string | null
): boolean {
  if (job.userId && job.userId !== userId) return false
  if (job.projectId && projectId) {
    return job.projectId === projectId
  }
  return true
}

async function backfillExportJobFromMemory(
  jobId: string,
  memJob: NonNullable<ReturnType<typeof getRenderJob>>
): Promise<void> {
  if (memJob.status === 'failed') {
    await syncExportJobFromRenderJob({
      jobId,
      status: 'failed',
      progress: 0,
      label: memJob.label,
      stage: memJob.stage,
      error: memJob.error ?? memJob.label,
    })
    return
  }
  if (memJob.status === 'done' && memJob.videoUrl) {
    await syncExportJobFromRenderJob({
      jobId,
      status: 'completed',
      progress: 100,
      label: memJob.label,
      stage: memJob.stage,
      renderUrl: memJob.videoUrl,
    })
  }
}

/**
 * Durable export status — prefers export_jobs, merges terminal memory job when DB row is stale.
 */
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

  const trimmedJobId = jobId.trim()
  const projectId = req.nextUrl.searchParams.get('projectId')?.trim() ?? null
  const memJob = getRenderJob(trimmedJobId)
  const exportRow = await getExportJob(trimmedJobId, auth.user!.id)

  if (
    memJob &&
    authorizeMemoryJob(memJob, auth.user!.id, projectId) &&
    (memJob.status === 'failed' || memJob.status === 'done')
  ) {
    const exportStale =
      exportRow &&
      ACTIVE_EXPORT_JOB_STATUSES.has(exportRow.status) &&
      (memJob.status === 'failed' || memJob.status === 'done')
    if (!exportRow || exportStale) {
      logJobStatusTransition({
        jobId: trimmedJobId,
        from: exportRow?.status ?? null,
        to: memJob.status === 'done' ? 'completed' : 'failed',
        stage: memJob.stage,
        label: memJob.label,
        reason: 'memory_backfill',
      })
      await backfillExportJobFromMemory(trimmedJobId, memJob)
    }
    const body = jobToExportPollResponse(memJob)
    logRenderJobTrace(renderJobTraceFromStatus(memJob, Boolean(body.reelUrl)))
    exportLog.poll({
      jobId: trimmedJobId,
      source: 'memory_terminal',
      status: body.status,
      hasUrl: Boolean(body.reelUrl),
    })
    return NextResponse.json({
      status: body.status,
      progress: body.progress,
      label: body.label,
      reelUrl: body.reelUrl,
      error: body.error,
      jobId: body.jobId,
      updatedAt: memJob.updatedAt ?? null,
    })
  }

  if (exportRow) {
    const body = exportJobToPollResponse(exportRow)
    if (
      ACTIVE_EXPORT_JOB_STATUSES.has(exportRow.status) &&
      projectId &&
      (exportRow.status === 'uploading' || exportRow.status === 'rendering')
    ) {
      const row = await loadOwnedCinematicProject(projectId, auth.user!.id)
      const reelUrl = row?.reel_url?.trim() || row?.video_url?.trim()
      if (reelUrl) {
        await syncExportJobFromRenderJob({
          jobId: trimmedJobId,
          status: 'completed',
          progress: 100,
          label: 'Download ready',
          stage: 'complete',
          renderUrl: reelUrl,
        })
        return NextResponse.json({
          status: 'completed',
          progress: 100,
          label: 'Download ready',
          reelUrl,
          error: null,
          jobId: trimmedJobId,
          updatedAt: new Date().toISOString(),
        })
      }
    }
    logRenderJobTrace({
      jobId: trimmedJobId,
      status: body.status,
      progress: body.progress,
      updatedAt: exportRow.updated_at,
      outputPath: body.reelUrl,
      mp4Exists: Boolean(body.reelUrl),
      stage: exportRow.metadata?.stage ?? null,
      label: body.label,
      error: body.error,
    })
    exportLog.poll({
      jobId: trimmedJobId,
      source: 'export_jobs',
      status: body.status,
      hasUrl: Boolean(body.reelUrl),
    })
    return NextResponse.json({
      status: body.status,
      progress: body.progress,
      label: body.label,
      reelUrl: body.reelUrl,
      error: body.error,
      jobId: body.jobId,
      updatedAt: exportRow.updated_at,
    })
  }

  if (memJob) {
    if (memJob.projectId) {
      const row = await loadOwnedCinematicProject(memJob.projectId, auth.user!.id)
      if (!row) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (memJob.userId && memJob.userId !== auth.user!.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    touchRenderJobHeartbeat(trimmedJobId)
    const body = jobToExportPollResponse(memJob)
    logRenderJobTrace(renderJobTraceFromStatus(memJob, Boolean(body.reelUrl)))
    exportLog.poll({
      jobId: trimmedJobId,
      source: 'memory_fallback',
      status: body.status,
      hasUrl: Boolean(body.reelUrl),
    })
    return NextResponse.json({
      status: body.status,
      progress: body.progress,
      label: body.label,
      reelUrl: body.reelUrl,
      error: body.error,
      jobId: body.jobId,
      updatedAt: memJob.updatedAt ?? null,
    })
  }

  if (projectId) {
    const row = await loadOwnedCinematicProject(projectId, auth.user!.id)
    if (row?.reel_job_id === trimmedJobId) {
      const validated = await buildValidatedDownloadResponse(row)
      if (validated.status === 'completed' && validated.reelUrl) {
        return NextResponse.json({
          status: 'completed',
          progress: 100,
          label: 'Download ready',
          reelUrl: validated.reelUrl,
          error: null,
          jobId: trimmedJobId,
        })
      }
    }
  }

  exportLog.error('export.status', 'job not found', { jobId: trimmedJobId })
  return NextResponse.json({ error: 'Job not found' }, { status: 404 })
}
