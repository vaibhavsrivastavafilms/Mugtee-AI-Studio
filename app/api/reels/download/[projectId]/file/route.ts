import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { loadOwnedCinematicProject } from '@/lib/reels/export-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeFilename(raw: string): string {
  const slug = raw
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug || 'mugtee-reel'
}

/** Streams a rendered reel MP4 with attachment headers (same-origin download). */
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
  if (!reelUrl) {
    return NextResponse.json(
      { error: 'MP4 not ready — compile the reel first.' },
      { status: 404 }
    )
  }

  const upstream = await fetch(reelUrl)
  if (!upstream.ok) {
    return NextResponse.json(
      { error: 'Could not fetch rendered MP4 from storage.' },
      { status: 502 }
    )
  }

  const buffer = await upstream.arrayBuffer()
  const filename = `${safeFilename(row.title || 'mugtee-reel')}.mp4`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
