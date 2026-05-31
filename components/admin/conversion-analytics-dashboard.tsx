'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import type { ConversionSummary } from '@/lib/analytics/compute-conversion-summary'

type SummaryResponse = {
  ok: boolean
  admin?: boolean
  window_days?: number
  conversion?: ConversionSummary
  error?: string
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <p className="text-[10px] tracking-wider uppercase text-muted-foreground">{label}</p>
      <p className="font-display text-2xl text-luxe mt-1">{value}</p>
      {hint ? <p className="text-[11px] text-luxe/45 mt-1">{hint}</p> : null}
    </div>
  )
}

function FunnelBar({
  label,
  value,
  max,
  dropoff,
}: {
  label: string
  value: number
  max: number
  dropoff?: number
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-luxe/85">{label}</span>
        <span className="text-luxe tabular-nums">
          {value.toLocaleString()}
          {dropoff != null && dropoff > 0 ? (
            <span className="ml-2 text-[9.5px] text-amber-300/80">−{dropoff}%</span>
          ) : null}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold-500/80 to-amber-300/70"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function ConversionAnalyticsDashboard() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<SummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const res = await fetch(`/api/analytics/summary?days=${days}`, { cache: 'no-store' })
        const body = (await res.json().catch(() => ({}))) as SummaryResponse
        if (!res.ok) {
          if (!cancelled) {
            setError(
              res.status === 403
                ? 'Admin access required (set ADMIN_EMAILS or ADMIN_USER_IDS).'
                : String(body.error || res.statusText)
            )
          }
          return
        }
        if (!cancelled) {
          if (!body.admin) {
            setError('Admin access required (set ADMIN_EMAILS or ADMIN_USER_IDS).')
            setData(null)
          } else {
            setData(body)
          }
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message || 'Failed to load analytics')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [days])

  const c = data?.conversion

  return (
    <div className="max-w-6xl mx-auto w-full pb-12">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-luxe/60 hover:text-luxe transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Founder dashboard
        </Link>
        <div className="ml-auto inline-flex items-center gap-1 rounded-lg bg-white/[0.03] border border-white/[0.08] p-0.5">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={
                'px-2.5 py-1 text-[10.5px] tracking-wider uppercase rounded-md transition ' +
                (days === d
                  ? 'bg-gold-500/15 text-gold-200'
                  : 'text-muted-foreground hover:text-luxe')
              }
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl text-luxe mb-1">Conversion analytics</h1>
      <p className="text-sm text-luxe/55 mb-6">
        Internal funnel, generation performance, and error visibility — admin only.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-luxe/50 py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading analytics…
        </div>
      ) : error ? (
        <p className="text-sm text-red-300/90 py-8 text-center">{error}</p>
      ) : !c ? (
        <p className="text-sm text-luxe/50 py-8 text-center">No conversion data yet.</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">
              Creator funnel
            </h2>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
              <FunnelBar label="Visitors" value={c.funnel.visitors} max={c.funnel.visitors || 1} />
              <FunnelBar
                label="Signups"
                value={c.funnel.signup_completed || c.funnel.signup_started}
                max={c.funnel.visitors || 1}
                dropoff={c.funnel.dropoff_pct.visitors_to_signup}
              />
              <FunnelBar
                label="First projects"
                value={c.funnel.first_projects}
                max={c.funnel.visitors || 1}
                dropoff={c.funnel.dropoff_pct.signup_to_project}
              />
              <FunnelBar
                label="First generations"
                value={c.funnel.first_generations}
                max={c.funnel.visitors || 1}
                dropoff={c.funnel.dropoff_pct.project_to_generation}
              />
              <FunnelBar
                label="Exports"
                value={c.funnel.exports}
                max={c.funnel.visitors || 1}
                dropoff={c.funnel.dropoff_pct.generation_to_export}
              />
            </div>
          </section>

          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">
              Launch metrics
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard
                label="Activation rate"
                value={`${c.launch.activation_rate_pct}%`}
                hint="First generation / signups"
              />
              <MetricCard
                label="Export rate"
                value={`${c.launch.export_rate_pct}%`}
                hint="Exports / first generations"
              />
              <MetricCard
                label="Retention snapshot"
                value={`${c.launch.retention_snapshot_pct}%`}
                hint="Multi-day returners"
              />
              <MetricCard
                label="Returning users"
                value={c.returning_users}
                hint="Active on 2+ days"
              />
            </div>
          </section>

          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">
              Generation performance
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <MetricCard
                label="Avg pipeline time"
                value={
                  c.avg_generation_time_ms != null
                    ? `${Math.round(c.avg_generation_time_ms / 1000)}s`
                    : '—'
                }
              />
              {Object.entries(c.avg_step_times_ms).map(([step, ms]) => (
                <MetricCard
                  key={step}
                  label={`Avg ${step}`}
                  value={`${Math.round(ms / 1000)}s`}
                  hint={`${ms.toLocaleString()}ms`}
                />
              ))}
            </div>
          </section>

          <div className="grid lg:grid-cols-2 gap-4">
            <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <h2 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">
                Most used features
              </h2>
              {c.top_features.length === 0 ? (
                <p className="text-sm text-luxe/45">No feature events yet</p>
              ) : (
                <ul className="space-y-1.5 text-sm text-luxe/80">
                  {c.top_features.map((row) => (
                    <li key={row.name} className="flex justify-between gap-2">
                      <span className="capitalize">{row.name.replace(/_/g, ' ')}</span>
                      <span className="text-gold-300/90 tabular-nums">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <h2 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">
                Error counts
              </h2>
              <ul className="space-y-1.5 text-sm text-luxe/80">
                <li className="flex justify-between">
                  <span>OpenAI failures</span>
                  <span className="text-rose-300/90 tabular-nums">{c.errors.openai}</span>
                </li>
                <li className="flex justify-between">
                  <span>API failures</span>
                  <span className="text-rose-300/90 tabular-nums">{c.errors.api}</span>
                </li>
                <li className="flex justify-between">
                  <span>Timeouts</span>
                  <span className="text-rose-300/90 tabular-nums">{c.errors.timeout}</span>
                </li>
                <li className="flex justify-between">
                  <span>Export failures</span>
                  <span className="text-rose-300/90 tabular-nums">{c.errors.export}</span>
                </li>
                <li className="flex justify-between border-t border-white/[0.06] pt-2 mt-2">
                  <span className="text-luxe">Total</span>
                  <span className="text-rose-300 tabular-nums font-medium">{c.errors.total}</span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
