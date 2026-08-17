import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/auth/server-user'
import { exportLog } from '@/lib/export/export-log.server'
import { verifyReelFileExists } from '@/lib/export/reel-url-validation.server'
import { getV7Production } from '@/lib/v7/db.server'
import { v7HasDeliverableMedia } from '@/lib/v7/deliverable-media.core'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { REEL_BUCKET } from '@/lib/video/reel-storage-upload'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

function safeFilename(raw: string): string {
  const slug = raw
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug || 'mugtee-reel'
}

async function loadReelBuffer(
  reelUrl: string,
  productionId: string
): Promise<{ buffer: ArrayBuffer; size: number }> {
  const verification = await verifyReelFileExists(reelUrl, productionId)
  if (verification.ok) {
    const upstream = await fetch(reelUrl)
    if (upstream.ok) {
      const buffer = await upstream.arrayBuffer()
      if (buffer.byteLength > 0) {
        return { buffer, size: buffer.byteLength }
      }
    }
  }

  const supabase = await createSupabaseServerClient()
  const storagePath = `${productionId}/final-reel.mp4`
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

/** Streams a V7 production MP4 with attachment headers (same-origin download). */
export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const productionId = id?.trim()
  if (!productionId) {
    return NextResponse.json({ error: 'productionId required' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const authResult = await getAuthenticatedUser(supabase)
  if (authResult.error) {
    return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 })
  }
  const user = authResult.user
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  const snapshot = await getV7Production(supabase, productionId, user.id)
  if (!snapshot) {
    return NextResponse.json({ error: 'Production not found' }, { status: 404 })
  }

  if (!v7HasDeliverableMedia(snapshot.production)) {
    return NextResponse.json(
      {
        error: 'MP4 not ready yet',
        exportStatus: snapshot.production.export_status,
        status: snapshot.production.status,
      },
      { status: 409 }
    )
  }

  const reelUrl = snapshot.production.reel_url?.trim()
  if (!reelUrl) {
    return NextResponse.json({ error: 'MP4 not ready yet' }, { status: 404 })
  }

  try {
    const { buffer, size } = await loadReelBuffer(reelUrl, productionId)
    const filename = `${safeFilename(snapshot.production.title || 'mugtee-reel')}.mp4`

    exportLog.downloadServed({
      projectId: productionId,
      filename,
      bytes: size,
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
    exportLog.error('v7 download serve', err, { productionId, reelUrl })
    const message = err instanceof Error ? err.message : 'Could not fetch rendered MP4.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
