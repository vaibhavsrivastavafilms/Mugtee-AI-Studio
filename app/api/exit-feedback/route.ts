import { NextRequest, NextResponse } from 'next/server'
import { EXIT_FEEDBACK_REASONS, EXIT_FEEDBACK_TRIGGERS } from '@/lib/creator/exit-feedback'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const VALID_REASONS = new Set(EXIT_FEEDBACK_REASONS.map((r) => r.value))
const VALID_TRIGGERS = new Set<string>(EXIT_FEEDBACK_TRIGGERS)

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

  const trigger = String(body.trigger || '').trim()
  const reason = String(body.reason || '').trim()
  if (!VALID_TRIGGERS.has(trigger)) {
    return NextResponse.json({ error: 'Invalid trigger' }, { status: 400 })
  }
  if (!VALID_REASONS.has(reason as (typeof EXIT_FEEDBACK_REASONS)[number]['value'])) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
  }

  const comment = body.comment ? String(body.comment).trim().slice(0, 2000) : null

  let creatorType: string | null = null
  const db = createSupabaseServiceClient()
  if (db) {
    const { data: app } = await db
      .from('founding_creator_applications')
      .select('creator_type')
      .eq('user_id', user.id)
      .maybeSingle()
    creatorType = app?.creator_type ?? null
  }

  const { error } = await supabase.from('creator_exit_feedback').insert({
    user_id: user.id,
    trigger,
    reason,
    comment,
    creator_type: creatorType,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
