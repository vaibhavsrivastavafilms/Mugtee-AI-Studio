import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import {
  loadOwnedCinematicProject,
  mapProjectReelStatus,
} from '@/lib/reels/export-api'

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

  const reelUrl = row.reel_url?.trim() || row.video_url?.trim() || null
  const status = mapProjectReelStatus(row.reel_status, reelUrl)

  if (status === 'completed' && reelUrl) {
    return NextResponse.json({
      status: 'completed',
      reelUrl,
      renderedAt: row.reel_rendered_at ?? null,
    })
  }

  return NextResponse.json({
    status,
    reelUrl: reelUrl ?? null,
    renderedAt: row.reel_rendered_at ?? null,
  })
}
