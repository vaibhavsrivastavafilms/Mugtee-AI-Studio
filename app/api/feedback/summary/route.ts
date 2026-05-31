import { NextResponse } from 'next/server'
import {
  EXPORT_READINESS_LABELS,
  IMPROVEMENT_REASON_LABELS,
  IMPROVEMENT_REASON_SEVERITY,
  type ExportReadiness,
  type ImprovementReason,
} from '@/lib/creator/moment-feedback'
import { isAdminUser } from '@/lib/admin/is-admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export type FeedbackPriorityItem = {
  key: string
  label: string
  count: number
  severity: number
  score: number
  kind: 'complaint' | 'export' | 'suggestion'
}

export type FeedbackSummary = {
  total: number
  table_available: boolean
  output_rating: {
    helpful: number
    needs_improvement: number
    helpful_pct: number
  }
  export_satisfaction: { key: ExportReadiness; label: string; count: number }[]
  top_complaints: { reason: ImprovementReason; label: string; count: number }[]
  recent_suggestions: { id: string; text: string; created_at: string }[]
  priority_queue: FeedbackPriorityItem[]
}

function rankCounts(counts: Record<string, number>): { name: string; count: number }[] {
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
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
      { error: 'SUPABASE_SERVICE_ROLE_KEY required for feedback summary' },
      { status: 503 }
    )
  }

  const { data: rows, error } = await db
    .from('creator_feedback')
    .select(
      'id, feedback_type, rating, improvement_reason, export_readiness, suggestion_text, feedback_text, created_at'
    )
    .gte('created_at', since)
    .not('feedback_type', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5000)

  if (error) {
    const missing = error.message.includes('creator_feedback') || error.message.includes('feedback_type')
    const empty: FeedbackSummary = {
      total: 0,
      table_available: !missing,
      output_rating: { helpful: 0, needs_improvement: 0, helpful_pct: 0 },
      export_satisfaction: [],
      top_complaints: [],
      recent_suggestions: [],
      priority_queue: [],
    }
    return NextResponse.json({ ok: true, summary: empty, days })
  }

  let helpful = 0
  let needsImprovement = 0
  const complaintCounts: Record<string, number> = {}
  const exportCounts: Record<string, number> = {}
  const suggestions: { id: string; text: string; created_at: string }[] = []

  for (const row of rows || []) {
    if (row.feedback_type === 'output_rating') {
      if (row.rating === 'helpful') helpful += 1
      if (row.rating === 'needs_improvement') needsImprovement += 1
      if (row.improvement_reason) {
        complaintCounts[row.improvement_reason] =
          (complaintCounts[row.improvement_reason] || 0) + 1
      }
    }
    if (row.feedback_type === 'export_satisfaction' && row.export_readiness) {
      exportCounts[row.export_readiness] = (exportCounts[row.export_readiness] || 0) + 1
    }
    if (row.feedback_type === 'suggestion') {
      const text = (row.suggestion_text || row.feedback_text || '').trim()
      if (text && suggestions.length < 20) {
        suggestions.push({ id: row.id, text, created_at: row.created_at })
      }
    }
  }

  const outputTotal = helpful + needsImprovement
  const helpfulPct = outputTotal > 0 ? Math.round((helpful / outputTotal) * 100) : 0

  const top_complaints = rankCounts(complaintCounts)
    .filter((r) => r.name in IMPROVEMENT_REASON_LABELS)
    .map((r) => ({
      reason: r.name as ImprovementReason,
      label: IMPROVEMENT_REASON_LABELS[r.name as ImprovementReason],
      count: r.count,
    }))

  const export_satisfaction = rankCounts(exportCounts)
    .filter((r) => r.name in EXPORT_READINESS_LABELS)
    .map((r) => ({
      key: r.name as ExportReadiness,
      label: EXPORT_READINESS_LABELS[r.name as ExportReadiness],
      count: r.count,
    }))

  const uniqueCreators = new Set((rows || []).map((r) => r.id)).size
  const creatorImpact = Math.max(1, uniqueCreators)

  const priority_queue: FeedbackPriorityItem[] = [
    ...top_complaints.map((c) => {
      const severity = IMPROVEMENT_REASON_SEVERITY[c.reason] ?? 1
      return {
        key: c.reason,
        label: c.label,
        count: c.count,
        severity,
        score: c.count * severity * creatorImpact,
        kind: 'complaint' as const,
      }
    }),
    ...export_satisfaction
      .filter((e) => e.key === 'major_edits')
      .map((e) => ({
        key: e.key,
        label: e.label,
        count: e.count,
        severity: 3,
        score: e.count * 3 * creatorImpact,
        kind: 'export' as const,
      })),
  ].sort((a, b) => b.score - a.score)

  const summary: FeedbackSummary = {
    total: rows?.length ?? 0,
    table_available: true,
    output_rating: {
      helpful,
      needs_improvement: needsImprovement,
      helpful_pct: helpfulPct,
    },
    export_satisfaction,
    top_complaints,
    recent_suggestions: suggestions,
    priority_queue,
  }

  return NextResponse.json({ ok: true, summary, days })
}
