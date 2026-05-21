// MUGTEE V4.0 — Analytics ingestion endpoint.
// Accepts events from the client and inserts into the analytics_events table.
// Anonymous visitors are allowed (user_id stays null) so we can log visitor_opened_site,
// pricing_opened, agency_demo_clicked etc. Fire-and-forget on the client side.

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const event_type = String(body?.event_type || '').trim().slice(0, 80)
    if (!event_type) return NextResponse.json({ ok: false, error: 'missing event_type' }, { status: 400 })

    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    const row = {
      user_id:    user?.id ?? null,
      session_id: String(body?.session_id || '').slice(0, 80) || null,
      event_type,
      metadata:   typeof body?.metadata === 'object' && body?.metadata !== null ? body.metadata : {},
      url:        String(body?.url || '').slice(0, 400) || null,
      referrer:   String(body?.referrer || '').slice(0, 400) || null,
      device:     String(body?.device || '').slice(0, 24) || null,
      country:    null as string | null,
    }

    // Fire-and-forget insert. We swallow errors so the client never blocks.
    const { error } = await supabase.from('analytics_events').insert(row)
    if (error) {
      // Don't surface to client — just no-op.
      return NextResponse.json({ ok: true, skipped: true }, { status: 200 })
    }
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ ok: true, skipped: true }, { status: 200 })
  }
}
