import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import {
  exportJobToPollResponse,
  findActiveExportJobForProject,
} from '@/lib/export/export-job-service'
import { exportStatusPollPath } from '@/lib/reels/export-paths'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Resume in-flight export after page refresh. */
export async function GET(req: NextRequest) {
  const auth = await requireCinematicUser()
  if (auth.response) return auth.response

  const projectId = req.nextUrl.searchParams.get('projectId')?.trim()
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  const active = await findActiveExportJobForProject(projectId, auth.user!.id)
  if (!active) {
    return NextResponse.json({ active: false })
  }

  const body = exportJobToPollResponse(active)
  return NextResponse.json({
    active: true,
    jobId: active.id,
    pollUrl: exportStatusPollPath(active.id, projectId),
    status: body.status,
    progress: body.progress,
    label: body.label,
  })
}
