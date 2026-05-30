import { NextResponse } from 'next/server'
import { formatExitReason } from '@/lib/creator/exit-feedback'
import { isAdminUser } from '@/lib/admin/is-admin'
import type { RankedCount } from '@/lib/admin/founder-dashboard-metrics'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export type ExitIntelligenceMetrics = {
  top_reasons: RankedCount[]
  trends_by_week: { week: string; count: number }[]
  by_creator_type: RankedCount[]
  total: number
  table_available: boolean
}

function rankCounts(counts: Record<string, number>): RankedCount[] {
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

function weekStartKey(iso: string): string {
  const d = new Date(iso)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff))
  return monday.toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!isAdminUser(user)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const days = Math.min(365, Math.max(7, Number(url.searchParams.get('days') || 90)))
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const db = createSupabaseServiceClient()
  if (!db) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY required for admin exit feedback' },
      { status: 503 }
    )
  }

  const { data: rows, error } = await db
    .from('creator_exit_feedback')
    .select('reason, creator_type, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5000)

  if (error) {
    const missing = error.message.includes('creator_exit_feedback')
    return NextResponse.json({
      ok: true,
      metrics: {
        top_reasons: [],
        trends_by_week: [],
        by_creator_type: [],
        total: 0,
        table_available: !missing,
      } satisfies ExitIntelligenceMetrics,
    })
  }

  const reasonCounts: Record<string, number> = {}
  const creatorTypeCounts: Record<string, number> = {}
  const weekCounts: Record<string, number> = {}

  for (const row of rows || []) {
    const reasonLabel = formatExitReason(row.reason)
    reasonCounts[reasonLabel] = (reasonCounts[reasonLabel] || 0) + 1

    const ctype = row.creator_type || 'unknown'
    creatorTypeCounts[ctype] = (creatorTypeCounts[ctype] || 0) + 1

    const week = weekStartKey(row.created_at)
    weekCounts[week] = (weekCounts[week] || 0) + 1
  }

  const trends_by_week = Object.entries(weekCounts)
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => a.week.localeCompare(b.week))

  const metrics: ExitIntelligenceMetrics = {
    top_reasons: rankCounts(reasonCounts),
    trends_by_week,
    by_creator_type: rankCounts(creatorTypeCounts),
    total: rows?.length ?? 0,
    table_available: true,
  }

  return NextResponse.json({ ok: true, metrics })
}
