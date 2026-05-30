import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getNotionConfig } from '@/lib/notion/env'
import { syncContentPiecesToNotion } from '@/lib/notion/client'
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

  const { configured } = getNotionConfig()
  if (!configured) {
    return NextResponse.json(
      {
        error: 'not_configured',
        message:
          'Set NOTION_API_KEY and NOTION_CALENDAR_DATABASE_ID in .env.local (see .env.example).',
      },
      { status: 503 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const contentId = body?.content_id ? String(body.content_id) : null
  const syncAll = body?.all === true

  let query = supabase
    .from('content_pieces')
    .select('*')
    .eq('user_id', user.id)
    .order('scheduled_at', { ascending: true, nullsFirst: false })

  if (contentId) {
    query = query.eq('id', contentId)
  } else if (!syncAll) {
    query = query.not('scheduled_at', 'is', null)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const items = (data || []) as ContentPiece[]
  if (!items.length) {
    return NextResponse.json({
      ok: true,
      synced: 0,
      created: 0,
      updated: 0,
      message: 'No calendar items to sync',
    })
  }

  const result = await syncContentPiecesToNotion(items)
  return NextResponse.json({ ok: result.errors.length === 0, ...result })
}
