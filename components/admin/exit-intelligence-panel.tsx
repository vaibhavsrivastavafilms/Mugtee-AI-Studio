'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { ExitIntelligenceMetrics } from '@/app/api/admin/exit-feedback/route'
import type { RankedCount } from '@/lib/admin/founder-dashboard-metrics'

function RankList({ title, items }: { title: string; items: RankedCount[] }) {
  return (
    <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <h3 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-luxe/45">No data yet</p>
      ) : (
        <ul className="space-y-1.5 text-sm text-luxe/80">
          {items.map((row) => (
            <li key={row.name} className="flex justify-between gap-2">
              <span className="truncate capitalize">{row.name.replace(/_/g, ' ')}</span>
              <span className="text-gold-300/90 tabular-nums shrink-0">{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function WeekTrendList({ items }: { items: { week: string; count: number }[] }) {
  return (
    <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <h3 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">
        Exit trends (by week)
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-luxe/45">No data yet</p>
      ) : (
        <ul className="space-y-1.5 text-sm text-luxe/80">
          {items.map((row) => (
            <li key={row.week} className="flex justify-between gap-2">
              <span className="truncate">Week of {row.week}</span>
              <span className="text-gold-300/90 tabular-nums shrink-0">{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function ExitIntelligencePanel({ days = 90 }: { days?: number }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<ExitIntelligenceMetrics | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/admin/exit-feedback?days=${days}`, { cache: 'no-store' })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error((body as { error?: string }).error || 'Failed to load')
        if (!cancelled) setMetrics((body as { metrics?: ExitIntelligenceMetrics }).metrics ?? null)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || 'Failed to load exit intelligence')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [days])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-luxe/50 py-6 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading exit intelligence…
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-300/90 py-4 text-center">{error}</p>
  }

  if (!metrics) {
    return <p className="text-sm text-luxe/45 py-4 text-center">No exit intelligence data.</p>
  }

  if (!metrics.table_available) {
    return (
      <p className="text-sm text-amber-200/80 py-4 text-center">
        Run migration <code className="text-luxe/60">0030_creator_exit_feedback.sql</code> to enable
        exit intelligence.
      </p>
    )
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <div>
          <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80">
            Creator exit intelligence
          </h2>
          <p className="text-[11px] text-luxe/45 mt-0.5">
            Why users stop — last {days} days · {metrics.total} responses
          </p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <RankList title="Top exit reasons" items={metrics.top_reasons} />
        <WeekTrendList items={metrics.trends_by_week} />
        <RankList title="Exit by user type" items={metrics.by_creator_type} />
      </div>
    </section>
  )
}
