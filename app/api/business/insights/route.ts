import { NextResponse } from 'next/server'
import { requireCompanionUser } from '@/lib/companion/api-helpers'
import { createBusinessEngine } from '@/lib/business/business-engine'
import { listBusinessInsights } from '@/lib/business/business-memory'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const url = new URL(req.url)
  const cached = url.searchParams.get('cached') === '1'

  const engine = createBusinessEngine(auth.supabase, auth.user!.id)

  if (cached) {
    const rows = await listBusinessInsights(auth.supabase, auth.user!.id, 'weekly_report', 5)
    return NextResponse.json({ ok: true, insights: rows })
  }

  const report = await engine.weeklyInsights()
  return NextResponse.json({ ok: true, report })
}
