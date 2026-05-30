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
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY required for referral claim' },
      { status: 503 }
    )
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const fromBody = String(body?.code || body?.referral_code || '').trim()
  const fromCookie = cookies().get(REFERRAL_COOKIE_NAME)?.value?.trim() || ''
  const code = fromBody || fromCookie

  if (!code) {
    return NextResponse.json({ ok: true, claimed: false, reason: 'no_code' })
  }

  const result = await claimReferral(db, user.id, code)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  const response = NextResponse.json(result)
  if (result.ok && result.claimed) {
    response.cookies.set(REFERRAL_COOKIE_NAME, '', { path: '/', maxAge: 0 })
  }
  return response
}
