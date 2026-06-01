import { NextRequest, NextResponse } from 'next/server'
import { getVideoJob, pruneVideoJobs } from '@/lib/video/video-job'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  pruneVideoJobs()
  const job = getVideoJob(params.id)
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json({
    jobId: job.jobId,
    sceneId: job.sceneId,
    projectId: job.projectId,
    provider: job.provider,
    status: job.status,
    label: job.label,
    videoUrl: job.videoUrl,
    thumbnailUrl: job.thumbnailUrl,
    duration: job.duration,
    generationTimeMs: job.generationTimeMs,
    error: job.error,
    updatedAt: job.updatedAt,
  })
}
