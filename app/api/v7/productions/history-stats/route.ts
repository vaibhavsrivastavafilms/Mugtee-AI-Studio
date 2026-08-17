import { NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/auth/server-user'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { computeV7HistoricalAverageMs } from '@/lib/v7/production-history-stats.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await getAuthenticatedUser(supabase)
    if (authResult.error) {
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 })
    }
    const user = authResult.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const stats = await computeV7HistoricalAverageMs(supabase, user.id)
    return NextResponse.json({ ok: true, ...stats })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load history stats'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
