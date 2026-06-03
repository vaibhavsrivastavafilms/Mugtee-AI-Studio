'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  IndianRupee,
  Loader2,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExecutiveReview } from '@/lib/business/types'

type DashboardData = {
  twin?: { displayName: string; metrics: { revenueInr?: number; leadsCount?: number } }
  goals: Array<{ id: string; title: string; metricType: string; currentValue: number; targetValue: number }>
  leads: Array<{ id: string; score: number; status: string; funnelStage: string }>
  review: ExecutiveReview | null
}

const FUNNEL_LABELS = ['Awareness', 'Consideration', 'Conversion', 'Retention'] as const

export function BusinessGrowthDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [twinRes, goalsRes, leadsRes] = await Promise.all([
        fetch('/api/business/twin'),
        fetch('/api/business/goals'),
        fetch('/api/business/leads'),
      ])
      const twinJson = await twinRes.json()
      const goalsJson = await goalsRes.json()
      const leadsJson = await leadsRes.json()
      setData({
        twin: twinJson.twin,
        goals: goalsJson.goals ?? [],
        leads: leadsJson.leads ?? [],
        review: null,
      })
    } catch {
      setError('Could not load business dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadExecutiveReview = useCallback(async (mode: 'coo' | 'growth' = 'coo') => {
    setReviewLoading(true)
    try {
      const res = await fetch(`/api/business/executive-review?mode=${mode}`)
      const json = await res.json()
      const review = json.review ?? json.review?.review ?? json
      setData((d) =>
        d
          ? {
              ...d,
              review:
                review.weekOf != null
                  ? (review as ExecutiveReview)
                  : ({
                      weekOf: review.weekOf ?? new Date().toISOString().slice(0, 10),
                      headline: json.agent?.headline ?? 'Executive review',
                      priorities: json.agent?.priorities ?? review.priorities ?? [],
                      risks: review.risks ?? [],
                      opportunities: review.opportunities ?? [],
                      worked: review.worked ?? [],
                      failed: review.failed ?? [],
                      funnelSummary: review.funnelSummary ?? {
                        awareness: 0,
                        consideration: 0,
                        conversion: 0,
                        retention: 0,
                      },
                      revenueInr: review.revenueInr ?? 0,
                      recommendedActions: review.recommendedActions ?? [],
                      mode,
                    } as ExecutiveReview),
            }
          : d
      )
    } finally {
      setReviewLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-luxe/50 text-sm py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading business OS…
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-300/90">{error}</p>
  }

  const funnel = data?.review?.funnelSummary ?? {
    awareness: data?.leads.filter((l) => l.funnelStage === 'awareness').length ?? 0,
    consideration: data?.leads.filter((l) => l.funnelStage === 'consideration').length ?? 0,
    conversion: data?.leads.filter((l) => l.funnelStage === 'conversion').length ?? 0,
    retention: data?.leads.filter((l) => l.funnelStage === 'retention').length ?? 0,
  }

  return (
    <section className="space-y-6 rounded-2xl border border-cyan-500/20 bg-white/[0.02] p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/80">
            MugteeOS Phase 6 — Business OS
          </p>
          <h2 className="font-display text-xl text-luxe tracking-wide">
            {data?.twin?.displayName ?? 'Growth Dashboard'}
          </h2>
          <p className="text-xs text-luxe/50 mt-1">
            Content → Engagement → Lead → Customer → Revenue
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadExecutiveReview('coo')}
          disabled={reviewLoading}
          className="px-4 py-2 rounded-xl border border-gold-500/30 bg-gold-500/10 text-[10px] tracking-[0.18em] uppercase text-gold-200 hover:bg-gold-500/15 disabled:opacity-50"
        >
          {reviewLoading ? 'Reviewing…' : 'Weekly executive review'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Users, label: 'Leads', value: data?.leads.length ?? 0 },
          {
            icon: IndianRupee,
            label: 'Revenue',
            value: `₹${(data?.review?.revenueInr ?? data?.twin?.metrics?.revenueInr ?? 0).toLocaleString('en-IN')}`,
          },
          { icon: Target, label: 'Goals', value: data?.goals.length ?? 0 },
          { icon: TrendingUp, label: 'Top lead score', value: data?.leads[0]?.score ?? '—' },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
          >
            <m.icon className="h-4 w-4 text-cyan-400/70 mb-2" />
            <p className="text-[10px] uppercase tracking-wider text-luxe/45">{m.label}</p>
            <p className="text-lg font-display text-luxe">{m.value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-luxe/45 mb-2 flex items-center gap-1">
          <BarChart3 className="h-3 w-3" /> Marketing funnel
        </p>
        <div className="grid grid-cols-4 gap-2">
          {FUNNEL_LABELS.map((label, i) => {
            const key = label.toLowerCase() as keyof typeof funnel
            const count = funnel[key] ?? 0
            return (
              <div key={label} className="text-center rounded-lg border border-white/8 py-2">
                <p className="text-[9px] uppercase text-luxe/40">{label}</p>
                <p className="text-sm font-medium text-luxe">{count}</p>
              </div>
            )
          })}
        </div>
      </div>

      {data?.review && (
        <div className="rounded-xl border border-gold-500/20 bg-gold-500/5 p-4 space-y-3">
          <p className="text-sm font-medium text-gold-100">{data.review.headline}</p>
          <div className="grid sm:grid-cols-2 gap-4 text-xs text-luxe/70">
            <div>
              <p className="text-[10px] uppercase text-luxe/40 mb-1">Worked</p>
              <ul className="space-y-1">
                {data.review.worked.map((w) => (
                  <li key={w}>+ {w}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] uppercase text-luxe/40 mb-1">Gaps</p>
              <ul className="space-y-1">
                {data.review.failed.map((f) => (
                  <li key={f}>− {f}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-[10px] uppercase text-luxe/40">COO priorities</p>
          <ul className="space-y-1 text-xs text-luxe/80">
            {data.review.priorities.map((p) => (
              <li key={p} className="flex items-start gap-2">
                <ArrowRight className="h-3 w-3 mt-0.5 text-cyan-400 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data?.goals.length ? (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-luxe/45 mb-2">Active goals</p>
          <ul className="space-y-2">
            {data.goals.slice(0, 4).map((g) => {
              const pct = g.targetValue
                ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100))
                : 0
              return (
                <li
                  key={g.id}
                  className={cn(
                    'rounded-lg border border-white/10 px-3 py-2 text-xs',
                    'flex justify-between items-center gap-2'
                  )}
                >
                  <span className="text-luxe/80">{g.title}</span>
                  <span className="text-cyan-300/80">{pct}%</span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
