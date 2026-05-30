import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { getReferralStats } from '@/lib/referral/referral-service'

export const dynamic = 'force-dynamic'

/** GET /api/referral — referral code, link, and stats for the signed-in user. */
export async function GET() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = createSupabaseServiceClient() ?? supabase
  try {
    const stats = await getReferralStats(db, user.id)
    return NextResponse.json({ ok: true, ...stats })
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || 'Failed to load referral' },
      { status: 500 }
    )
  }
}
