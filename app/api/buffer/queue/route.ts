import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getBufferConfig } from '@/lib/buffer/env'
import { queueContentToBuffer, BufferApiError } from '@/lib/buffer/client'
import type { ContentPiece } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { configured } = getBufferConfig()
  if (!configured) {
    return NextResponse.json(
      {
        error: 'not_configured',
        message: 'Set BUFFER_ACCESS_TOKEN in .env.local (see .env.example).',
      },
      { status: 503 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const contentId = body?.content_id ? String(body.content_id) : ''

  let item: ContentPiece | null = null

  if (contentId) {
    const { data: content, error } = await supabase
      .from('content_pieces')
      .select('*')
      .eq('id', contentId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    item = (content as ContentPiece) || null
  }

  if (!item && body?.title) {
    item = {
      id: contentId || `inline-${Date.now()}`,
      title: String(body.title),
      description: body?.description ? String(body.description) : null,
      platform: (body?.platform as ContentPiece['platform']) || 'instagram',
      media_url: body?.media_url ? String(body.media_url) : null,
      scheduled_at: body?.scheduled_at ? String(body.scheduled_at) : null,
      status: 'scheduled',
    }
  }

  if (!item) {
    return NextResponse.json(
      { error: contentId ? 'Content piece not found' : 'content_id or title required' },
      { status: contentId ? 404 : 400 }
    )
  }
  const text = [item.title, item.description].filter(Boolean).join('\n\n')
  if (!text.trim()) {
    return NextResponse.json(
      { error: 'Add a title or caption before queueing to Buffer.' },
      { status: 400 }
    )
  }

  try {
    const result = await queueContentToBuffer({
      item,
      profileId: body?.profile_id ? String(body.profile_id) : undefined,
      scheduledAt: body?.scheduled_at ? String(body.scheduled_at) : item.scheduled_at,
    })

    try {
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Queued to Buffer',
        message: item.title,
        type: 'publish',
        link: '/pipeline',
      })
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({
      ok: true,
      update_id: result.updateId,
      profile_id: result.profileId,
    })
  } catch (e: unknown) {
    const meta = e instanceof BufferApiError ? e : null
    return NextResponse.json(
      { error: meta?.message || 'Buffer queue failed' },
      { status: meta?.status && meta.status >= 400 ? meta.status : 502 }
    )
  }
}
