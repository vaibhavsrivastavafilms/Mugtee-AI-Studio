import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { loadOwnedCinematicProject } from '@/lib/reels/export-api'
import { exportLog } from '@/lib/export/export-log.server'
import { verifyReelFileExists } from '@/lib/export/reel-url-validation.server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { REEL_BUCKET } from '@/lib/video/reel-storage-upload'
import { Mp4ExportEvents } from '@/lib/analytics/mp4-export-events'
import { trackMp4ExportServer } from '@/lib/analytics/mp4-export-track.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeFilename(raw: string): string {
  const slug = raw
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug || 'mugtee-reel'
}

async function loadReelBuffer(
  reelUrl: string,
  projectId: string
): Promise<{ buffer: ArrayBuffer; size: number }> {
  const verification = await verifyReelFileExists(reelUrl, projectId)
  if (verification.ok) {
    const upstream = await fetch(reelUrl)
    if (upstream.ok) {
      const buffer = await upstream.arrayBuffer()
      if (buffer.byteLength > 0) {
        return { buffer, size: buffer.byteLength }
      }
    }
  }

  const supabase = createSupabaseServerClient()
  const storagePath = `${projectId}/final-reel.mp4`
  const { data, error } = await supabase.storage.from(REEL_BUCKET).download(storagePath)
  if (error || !data) {
    throw new Error(error?.message ?? 'Could not fetch rendered MP4 from storage.')
  }
  const buffer = await data.arrayBuffer()
  if (buffer.byteLength <= 0) {
    throw new Error('Rendered MP4 is empty.')
  }
  return { buffer, size: buffer.byteLength }
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
    exportLog.error('download serve', 'missing reel url', { projectId: projectId.trim() })
    return NextResponse.json(
      { error: 'MP4 not ready — compile the reel first.' },
      { status: 404 }
    )
  }

  try {
    const { buffer, size } = await loadReelBuffer(reelUrl, projectId.trim())
    const filename = `${safeFilename(row.title || 'mugtee-reel')}.mp4`

    exportLog.downloadServed({
      projectId: projectId.trim(),
      filename,
      bytes: size,
    })

    void trackMp4ExportServer({
      event: Mp4ExportEvents.MP4_DOWNLOADED,
      userId: auth.user!.id,
      page: '/api/reels/download/file',
      metadata: {
        projectId: projectId.trim(),
        file_size_bytes: size,
        source: 'api_reels_download',
      },
    })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(size),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err) {
    exportLog.error('download serve', err, { projectId: projectId.trim(), reelUrl })
    const message = err instanceof Error ? err.message : 'Could not fetch rendered MP4.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
