'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { CreatorValidationMetrics } from '@/lib/analytics/compute-metrics'

function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-4">
      <p className="text-[10px] tracking-[0.2em] uppercase text-gold-300/70">{label}</p>
      <p className="font-display text-2xl text-luxe mt-1">{value}</p>
      {hint ? <p className="text-[11px] text-luxe/45 mt-1">{hint}</p> : null}
    </div>
  )
}

export function CreatorValidationDashboard() {
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<CreatorValidationMetrics | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/admin/metrics?days=${days}`, { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data?.error || 'Could not load metrics')
        if (!cancelled) setMetrics(data.metrics ?? null)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || 'Could not load metrics')
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
      <div className="flex items-center gap-2 text-luxe/50 text-sm py-20 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading creator validation metrics…
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <p className="text-sm text-amber-200/80 text-center py-16">
        {error || 'Metrics unavailable. Check admin access and service role key.'}
      </p>
    )
  }

  const m = metrics
  const avgGenSec =
    m.avg_generation_time_ms != null ? `${Math.round(m.avg_generation_time_ms / 1000)}s` : '—'

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-luxe">Creator validation</h1>
          <p className="text-sm text-luxe/50 mt-1">Funnel, quality, and trust signals — last {days} days</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-luxe"
        >
          {[7, 14, 30, 90].map((d) => (
            <option key={d} value={d}>
              {d} days
            </option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total creators" value={m.total_creators} />
        <MetricCard label="DAU (today)" value={m.dau} />
        <MetricCard label="Projects created" value={m.projects_created} />
        <MetricCard label="Avg projects / creator" value={m.avg_projects_per_creator} />
        <MetricCard
          label="Generation success"
          value={`${m.generation_success_rate}%`}
          hint="completed vs started+failed"
        />
        <MetricCard label="Resume success" value={`${m.resume_success_rate}%`} />
        <MetricCard label="Export rate" value={`${m.export_rate}%`} />
        <MetricCard label="Avg generation time" value={avgGenSec} />
      </div>

      <section className="rounded-xl border border-white/10 bg-black/30 p-5">
        <h2 className="text-[11px] tracking-[0.2em] uppercase text-gold-300/80 mb-4">Creator funnel</h2>
        <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center text-sm">
          {(
            [
              ['Landing', m.funnel.landing],
              ['Signup', m.funnel.signup],
              ['Project', m.funnel.first_project],
              ['Generation', m.funnel.first_generation],
              ['Storyboard', m.funnel.storyboard],
              ['Export', m.funnel.export],
            ] as const
          ).map(([label, count]) => (
            <div key={label} className="rounded-lg border border-white/[0.06] py-3">
              <p className="text-luxe/45 text-[10px] uppercase tracking-wider">{label}</p>
              <p className="text-luxe font-medium text-lg mt-1">{count}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid sm:grid-cols-2 gap-2 text-[11px] text-luxe/55">
          {Object.entries(m.funnel.dropoff_pct).map(([k, v]) => (
            <p key={k}>
              Dropoff {k.replace(/_/g, ' ')}: <span className="text-amber-200/90">{v}%</span>
            </p>
          ))}
        </div>
      </section>

      <div className="grid sm:grid-cols-2 gap-4">
        <section className="rounded-xl border border-white/10 bg-black/30 p-5">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-gold-300/80 mb-3">Top niche</h2>
          <p className="text-luxe">
            {m.top_niche ? `${m.top_niche.name} (${m.top_niche.count} gens)` : '—'}
          </p>
        </section>
        <section className="rounded-xl border border-white/10 bg-black/30 p-5">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-gold-300/80 mb-3">Top duration</h2>
          <p className="text-luxe">
            {m.top_duration ? `${m.top_duration.seconds}s (${m.top_duration.count})` : '—'}
          </p>
        </section>
      </div>

      <section className="rounded-xl border border-white/10 bg-black/30 p-5">
        <h2 className="text-[11px] tracking-[0.2em] uppercase text-gold-300/80 mb-3">
          Highest rated outputs
        </h2>
        {m.highest_rated_outputs.length === 0 ? (
          <p className="text-luxe/50 text-sm">No feedback yet in this window.</p>
        ) : (
          <ul className="space-y-1 text-sm text-luxe/80">
            {m.highest_rated_outputs.map((r) => (
              <li key={r.rating}>
                {r.rating}: {r.count}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
