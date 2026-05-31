import { NextResponse } from 'next/server'
import { buildWeeklyContentPlan } from '@/lib/agent/weekly-content-planner'
import { loadCreatorAgentContext, todayDate } from '@/lib/agent/agent-server'
import { weekStartDate } from '@/lib/agent/agent-context'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const { auth, ctx } = await loadCreatorAgentContext()
  if (auth.response) return auth.response
  if (!ctx) return NextResponse.json({ error: 'Context unavailable' }, { status: 500 })

  const weekStart = weekStartDate()
  const plan = buildWeeklyContentPlan(ctx, weekStart)

  await auth.supabase.from('creator_weekly_plan').upsert(
    {
      user_id: auth.user!.id,
      week_start: weekStart,
      plan,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,week_start' }
  )

  return NextResponse.json({ ok: true, plan, generatedAt: todayDate() })
}
