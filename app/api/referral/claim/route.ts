import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { REFERRAL_COOKIE_NAME } from '@/lib/referral/constants'
import { claimReferral } from '@/lib/referral/referral-service'

export const dynamic = 'force-dynamic'

/** POST /api/referral/claim — attribute signup to referrer (idempotent). */
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = createSupabaseServiceClient()
  if (!db) {
    return NextResponse.json({ ok: true, claimed: false, reason: 'service_unavailable' })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const fromBody = String(body?.code || body?.referral_code || '').trim()
  const fromCookie = (await cookies()).get(REFERRAL_COOKIE_NAME)?.value?.trim() || ''
  const code = fromBody || fromCookie

  if (!code) {
    return NextResponse.json({ ok: true, claimed: false, reason: 'no_code' })
  }

  try {
    const result = await claimReferral(db, user.id, code)
    if (!result.ok) {
      console.warn('[referral/claim] skipped:', result.error)
      return NextResponse.json({ ok: true, claimed: false, reason: 'claim_failed' })
    }

    const response = NextResponse.json(result)
    if (result.claimed) {
      response.cookies.set(REFERRAL_COOKIE_NAME, '', { path: '/', maxAge: 0 })
    }
    return response
  } catch (e) {
    console.warn('[referral/claim] skipped:', (e as Error)?.message || e)
    return NextResponse.json({ ok: true, claimed: false, reason: 'service_unavailable' })
  }
}
