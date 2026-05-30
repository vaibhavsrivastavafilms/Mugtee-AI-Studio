import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  buildLimitErrorBody,
  checkLimit,
  getUsage,
  incrementUsage,
  type UsageMetric,
} from '@/lib/usage/usage-tracker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const METRICS: UsageMetric[] = ['projects', 'generations', 'exports', 'renders']

function parseMetric(raw: unknown): UsageMetric | null {
  const m = String(raw || '').trim() as UsageMetric
  return METRICS.includes(m) ? m : null
}

/** GET /api/usage — current usage vs FREE plan limits. */
export async function GET() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const snapshot = await getUsage(user.id)
  return NextResponse.json(snapshot)
}

/**
 * POST /api/usage — client hook for export / project checks.
 * body: { metric: UsageMetric, action?: 'check' | 'increment' }
 */
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const metric = parseMetric(body?.metric)
  if (!metric) {
    return NextResponse.json({ error: 'Invalid metric' }, { status: 400 })
  }

  const action = String(body?.action || 'increment').trim()
  if (action === 'check') {
    const check = await checkLimit(user.id, metric)
    if (!check.allowed) {
      return NextResponse.json(buildLimitErrorBody(check), { status: 429 })
    }
    return NextResponse.json({ ok: true, ...check })
  }

  if (action !== 'increment') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const check = await checkLimit(user.id, metric)
  if (!check.allowed) {
    return NextResponse.json(buildLimitErrorBody(check), { status: 429 })
  }

  await incrementUsage(user.id, metric)
  const snapshot = await getUsage(user.id)
  return NextResponse.json({ ok: true, metric, usage: snapshot })
}
