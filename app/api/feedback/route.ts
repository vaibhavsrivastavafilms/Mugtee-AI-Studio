import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const rating = Number(body.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 })
  }

  const projectId = body.project_id ? String(body.project_id).slice(0, 36) : null
  const comment = body.comment
    ? String(body.comment).trim().slice(0, 2000)
    : body.feedback_text
      ? String(body.feedback_text).trim().slice(0, 2000)
      : null

  const { error } = await supabase.from('project_feedback').upsert(
    {
      user_id: user.id,
      project_id: projectId,
      rating,
      comment,
    },
    { onConflict: 'user_id,project_id' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
