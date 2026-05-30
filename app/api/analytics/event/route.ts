import { NextResponse } from 'next/server'
import {
  buildAnalyticsEventRow,
  parseAnalyticsEventBody,
} from '@/lib/analytics/track-event'
import { insertAnalyticsEventRow } from '@/lib/analytics/track-server-event'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>))

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const parsed = parseAnalyticsEventBody(body, { userId: user?.id ?? null })
    if (!parsed) {
      return NextResponse.json({ ok: false, error: 'missing event' }, { status: 400 })
    }

    const row = buildAnalyticsEventRow(parsed)
    if (!row) return NextResponse.json({ ok: true, skipped: true })

    await insertAnalyticsEventRow(row)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true, skipped: true })
  }
}
