import { NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/admin/is-admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

/** GET /api/admin/referrals — all referral attributions (admin only). */
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
      { error: 'SUPABASE_SERVICE_ROLE_KEY required for admin referrals' },
      { status: 503 }
    )
  }

  const { data: rows, error } = await db
    .from('referrals')
    .select('id, referrer_id, invitee_id, code, reward_granted, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = new Set<string>()
  for (const r of rows || []) {
    if (r.referrer_id) userIds.add(r.referrer_id)
    if (r.invitee_id) userIds.add(r.invitee_id)
  }

  const emailById: Record<string, string> = {}
  for (const uid of userIds) {
    try {
      const { data: authUser } = await db.auth.admin.getUserById(uid)
      if (authUser?.user?.email) emailById[uid] = authUser.user.email
    } catch {
      /* skip */
    }
  }

  const items = (rows || []).map((row) => ({
    id: row.id,
    referrer_id: row.referrer_id,
    invitee_id: row.invitee_id,
    referrer_email: emailById[row.referrer_id] || row.referrer_id,
    invitee_email: emailById[row.invitee_id] || row.invitee_id,
    code: row.code,
    reward_granted: row.reward_granted,
    signup_date: row.created_at,
  }))

  return NextResponse.json({ ok: true, items })
}
