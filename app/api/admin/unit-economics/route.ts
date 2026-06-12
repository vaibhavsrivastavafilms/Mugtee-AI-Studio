import { NextResponse } from 'next/server'
import { computeUnitEconomicsDashboard } from '@/lib/admin/unit-economics-metrics'
import { isAdminUser } from '@/lib/admin/is-admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!isAdminUser(user)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  try {
    const metrics = await computeUnitEconomicsDashboard()
    return NextResponse.json({ ok: true, metrics })
  } catch (err) {
    console.error('[admin/unit-economics]', err)
    return NextResponse.json({ error: 'Failed to load unit economics' }, { status: 500 })
  }
}
