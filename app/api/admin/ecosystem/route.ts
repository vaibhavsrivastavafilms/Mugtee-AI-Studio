import { NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/admin/is-admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getEcosystemObservability } from '@/lib/ecosystem/observability'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!isAdminUser(user)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get('days') || 30)))
  const metrics = await getEcosystemObservability(supabase, days)
  return NextResponse.json(metrics)
}
