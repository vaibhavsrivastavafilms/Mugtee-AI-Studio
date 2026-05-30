import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { trackReferralVisit } from '@/lib/referral/referral-service'

export const dynamic = 'force-dynamic'

/** POST /api/referral/visit — increment invitations sent for a referral code. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const code = String(body?.code || '').trim()
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

  const db = createSupabaseServiceClient()
  if (!db) {
    return NextResponse.json({ ok: true, tracked: false })
  }

  let visitorUserId: string | null = null
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    visitorUserId = user?.id ?? null
  } catch {
    /* public visit */
  }

  const { ok } = await trackReferralVisit(db, code, visitorUserId)
  return NextResponse.json({ ok: true, tracked: ok })
}
