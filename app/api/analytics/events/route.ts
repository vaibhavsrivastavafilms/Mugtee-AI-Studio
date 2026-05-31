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
    const rawEvents = Array.isArray(body.events) ? body.events : [body]

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let inserted = 0
    for (const raw of rawEvents.slice(0, 50)) {
      if (!raw || typeof raw !== 'object') continue
      const parsed = parseAnalyticsEventBody(raw as Record<string, unknown>, {
        userId: user?.id ?? null,
      })
      if (!parsed) continue
      const row = buildAnalyticsEventRow(parsed)
      if (!row) continue
      await insertAnalyticsEventRow(row)
      inserted++
    }

    return NextResponse.json({ ok: true, inserted })
  } catch {
    return NextResponse.json({ ok: true, skipped: true })
  }
}
