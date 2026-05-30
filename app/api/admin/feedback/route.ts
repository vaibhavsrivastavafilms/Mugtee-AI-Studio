import { NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/admin/is-admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!isAdminUser(user)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const db = createSupabaseServiceClient()
  if (!db) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY required for admin feedback' },
      { status: 503 }
    )
  }

  const { data: feedbackRows, error: fbErr } = await db
    .from('project_feedback')
    .select('id, user_id, project_id, rating, comment, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  if (fbErr) return NextResponse.json({ error: fbErr.message }, { status: 500 })

  const userIds = [...new Set((feedbackRows || []).map((r) => r.user_id).filter(Boolean))]
  const creatorTypeByUser: Record<string, string> = {}

  if (userIds.length > 0) {
    const { data: apps } = await db
      .from('founding_creator_applications')
      .select('user_id, creator_type')
      .in('user_id', userIds)

    for (const app of apps || []) {
      if (app.user_id) creatorTypeByUser[app.user_id] = app.creator_type
    }
  }

  const items = (feedbackRows || []).map((row) => ({
    id: row.id,
    rating: row.rating,
    feedback: row.comment,
    creator_type: creatorTypeByUser[row.user_id] || null,
    project_id: row.project_id,
    user_id: row.user_id,
    date: row.created_at,
  }))

  return NextResponse.json({ ok: true, items })
}
