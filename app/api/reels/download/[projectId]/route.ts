import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import {
  buildValidatedDownloadResponse,
  loadOwnedCinematicProject,
} from '@/lib/reels/export-api'
import { exportLog } from '@/lib/export/export-log.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireCinematicUser()
  if (auth.response) return auth.response

  const { projectId } = await context.params
  if (!projectId?.trim()) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  const row = await loadOwnedCinematicProject(projectId.trim(), auth.user!.id)
  if (!row) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const body = await buildValidatedDownloadResponse(row)
  exportLog.poll({
    projectId: projectId.trim(),
    status: body.status,
    validated: body.validated,
    hasUrl: Boolean(body.reelUrl),
  })

  return NextResponse.json(body)
}
