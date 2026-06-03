import { NextResponse } from 'next/server'
import { requireCompanionUser, parseJsonObject } from '@/lib/companion/api-helpers'
import { listBusinessGoals } from '@/lib/business/business-memory'
import { planFromGoal } from '@/lib/business/growth-engine'
import type { GoalMetricType } from '@/lib/business/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const METRICS: GoalMetricType[] = ['followers', 'clients', 'revenue_inr', 'reservations']

export async function GET() {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const goals = await listBusinessGoals(auth.supabase, auth.user!.id)
  return NextResponse.json({ ok: true, goals })
}

export async function POST(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response
  const body = parsed.body!

  const metricType = String(body.metricType ?? 'followers') as GoalMetricType
  if (!METRICS.includes(metricType)) {
    return NextResponse.json({ error: 'Invalid metricType' }, { status: 400 })
  }

  const title = String(body.title ?? '').trim()
  const targetValue = Number(body.targetValue ?? 0)
  if (!title || targetValue <= 0) {
    return NextResponse.json({ error: 'title and targetValue required' }, { status: 400 })
  }

  const goal = await planFromGoal(auth.supabase, auth.user!.id, {
    metricType,
    title,
    targetValue,
    deadline: typeof body.deadline === 'string' ? body.deadline : null,
  })

  return NextResponse.json({ ok: true, goal })
}
