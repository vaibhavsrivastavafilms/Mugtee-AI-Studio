// Phase V1.2 — Trust Fix #5: Lightweight email-capture endpoint.
// No CRM. No DB writes. Just structured server-log line so we can grep for early leads.
// When we plug in Resend / Beehiiv / Mailchimp later, this is the only file that changes.

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const email = String(body?.email || '').trim().toLowerCase()
    const source = String(body?.source || 'unknown').slice(0, 50)
    if (!EMAIL_RX.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    // Structured log — grep-able for now, swap to Resend/Beehiiv later.
    console.log(JSON.stringify({ evt: 'lead_capture', email, source, at: new Date().toISOString() }))
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
