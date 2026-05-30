import { NextResponse } from 'next/server'
import { computeGrowthSignals } from '@/lib/admin/growth-signals'
import { isAdminUser } from '@/lib/admin/is-admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!isAdminUser(user)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const days = Math.min(90, Math.max(7, Number(url.searchParams.get('days') || 30)))

  const db = createSupabaseServiceClient()
  if (!db) {
    return NextResponse.json(
      { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY required for growth signals' },
      { status: 503 }
    )
  }

  try {
    const metrics = await computeGrowthSignals(db, days)
    return NextResponse.json({ ok: true, metrics })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'growth_signals_failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
