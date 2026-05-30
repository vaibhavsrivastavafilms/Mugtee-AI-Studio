'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Download, ExternalLink, Loader2 } from 'lucide-react'
import { ExitIntelligencePanel } from '@/components/admin/exit-intelligence-panel'
import type { ValidationDashboardMetrics } from '@/lib/admin/validation-dashboard'
import type { RankedCount } from '@/lib/admin/founder-dashboard-metrics'

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

function RankList({ title, items }: { title: string; items: RankedCount[] }) {
  return (
    <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <h2 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">{title}</h2>
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

export function ValidationDashboard() {
  const [days, setDays] = useState(30)
  const [metrics, setMetrics] = useState<ValidationDashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/validation?days=${days}`, { cache: 'no-store' })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (!cancelled) {
            setError(
              res.status === 403
                ? 'Admin access required (set ADMIN_EMAILS or ADMIN_USER_IDS).'
                : String((body as { error?: string }).error || res.statusText)
            )
          }
          return
        }
        if (!cancelled) {
          setMetrics((body as { metrics?: ValidationDashboardMetrics }).metrics ?? null)
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message || 'Failed to load validation metrics')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [days])

  const downloadReport = useCallback(() => {
    if (!metrics) return
    const blob = new Blob([metrics.founder_summary.report_text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mugtee-founder-summary-${days}d.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [metrics, days])

  const copyReport = useCallback(async () => {
    if (!metrics) return
    try {
      await navigator.clipboard.writeText(metrics.founder_summary.report_text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }, [metrics])

  return (
    <div className="max-w-6xl mx-auto w-full pb-12">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-luxe/60 hover:text-luxe transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Founder hub
        </Link>
        <div className="flex items-center gap-4 ml-auto flex-wrap">
          <Link
            href="/admin/feedback"
            className="inline-flex items-center gap-1 text-xs text-gold-300/80 hover:text-gold-300 transition"
          >
            Feedback <ExternalLink className="w-3 h-3" />
          </Link>
          <Link
            href="/admin/interviews"
            className="inline-flex items-center gap-1 text-xs text-gold-300/80 hover:text-gold-300 transition"
          >
            Interviews <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-luxe mb-1">30-Day Validation</h1>
          <p className="text-sm text-luxe/55">
            Phase 7 founder metrics — growth, retention, features, and feedback signals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1.5 text-xs border transition ${
                days === d
                  ? 'border-gold-500/40 bg-gold-500/10 text-gold-200'
                  : 'border-white/10 text-luxe/50 hover:text-luxe'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-luxe/50 py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading validation metrics…
        </div>
      ) : error ? (
        <p className="text-sm text-red-300/90 py-8 text-center">{error}</p>
      ) : !metrics ? (
        <p className="text-sm text-luxe/50 py-8 text-center">No metrics available.</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">Users</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <MetricCard label="New users today" value={metrics.users.new_today} />
              <MetricCard label="New users this week" value={metrics.users.new_this_week} />
              <MetricCard label="New users this month" value={metrics.users.new_this_month} />
              <MetricCard label="Active users (7d)" value={metrics.users.active_7d} />
              <MetricCard label="Active users (30d)" value={metrics.users.active_30d} />
              <MetricCard
                label="Total users"
                value={metrics.users.total_all_time}
                hint="All-time"
              />
            </div>
          </section>

          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">
              Activity ({metrics.window_days}d window)
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <MetricCard
                label="Projects created"
                value={metrics.activity.projects_created_window}
                hint={`All-time: ${metrics.activity.projects_created_all_time}`}
              />
              <MetricCard
                label="Exports downloaded"
                value={metrics.activity.exports_downloaded_window}
                hint={`All-time (profiles): ${metrics.activity.exports_downloaded_all_time}`}
              />
              <MetricCard
                label="Videos generated"
                value={metrics.activity.videos_generated_window}
                hint={`All-time: ${metrics.activity.videos_generated_all_time}`}
              />
              <MetricCard
                label="Retention (2+ projects)"
                value={
                  metrics.retention.returning_users_pct !== null
                    ? `${metrics.retention.returning_users_pct}%`
                    : '—'
                }
                hint={`${metrics.retention.users_with_2plus_projects} of ${metrics.retention.users_with_any_project} creators with projects`}
              />
              <MetricCard
                label="Upgrade intent"
                value={
                  metrics.upgrade_intent.table_available
                    ? metrics.upgrade_intent.waitlist_total
                    : 'N/A'
                }
                hint={
                  metrics.upgrade_intent.table_available
                    ? `${metrics.upgrade_intent.waitlist_in_window} in last ${metrics.window_days}d`
                    : 'Run migration 0027_upgrade_waitlist'
                }
              />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              <MetricCard
                label="Pricing visits"
                value={metrics.revenue_funnel.pricing_visits}
              />
              <MetricCard
                label="Upgrade clicks"
                value={metrics.revenue_funnel.upgrade_clicks}
              />
              <MetricCard
                label="Conversion rate"
                value={
                  metrics.revenue_funnel.conversion_rate !== null
                    ? `${(metrics.revenue_funnel.conversion_rate * 100).toFixed(1)}%`
                    : '—'
                }
                hint="upgrade clicks ÷ pricing visits"
              />
              <MetricCard
                label="Payment attempts"
                value={metrics.revenue_funnel.payment_attempts}
              />
            </div>
            {metrics.revenue_funnel.plan_interest_by_plan.length > 0 ? (
              <div className="mt-3">
                <RankList
                  title="Plan interest (creator vs pro)"
                  items={metrics.revenue_funnel.plan_interest_by_plan}
                />
              </div>
            ) : null}
          </section>

          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">
              Top features
            </h2>
            <p className="text-[11px] text-luxe/45 mb-3">
              Source: {metrics.top_features.source.replace(/_/g, ' ')}
              {metrics.top_features.source === 'profile_counters'
                ? ' (run migration 0029_feature_usage_events for event-level tracking)'
                : ''}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <RankList title="Most used" items={metrics.top_features.most_used} />
              <RankList title="Least used" items={metrics.top_features.least_used} />
            </div>
          </section>

          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">
              User feedback
            </h2>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <RankList
                title="Most requested features"
                items={metrics.feedback.most_requested_features}
              />
              <RankList
                title="Most common complaints"
                items={metrics.feedback.most_common_complaints}
              />
            </div>
            {metrics.upgrade_intent.by_plan.length > 0 ? (
              <div className="mb-4">
                <RankList title="Plan interest (waitlist)" items={metrics.upgrade_intent.by_plan} />
              </div>
            ) : null}
            {metrics.feedback.most_loved.length > 0 ? (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <h3 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">
                  Most loved (rating 4–5)
                </h3>
                <ul className="space-y-2 text-sm text-luxe/75">
                  {metrics.feedback.most_loved.map((row, i) => (
                    <li key={i} className="border-b border-white/[0.05] pb-2 last:border-0">
                      <span className="text-gold-300/80">{row.rating}/5</span>
                      <span className="text-luxe/40 mx-2">·</span>
                      {row.comment}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-luxe/45">No high-rating feedback with comments yet.</p>
            )}
          </section>

          <ExitIntelligencePanel days={days} />

          <section className="rounded-xl border border-gold-500/20 bg-gold-500/[0.04] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80">
                Founder summary — weekly report
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyReport}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-luxe/70 hover:text-luxe transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={downloadReport}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gold-500/30 bg-gold-500/10 px-3 py-1.5 text-xs text-gold-200 hover:border-gold-500/50 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download .txt
                </button>
              </div>
            </div>
            <pre className="text-xs text-luxe/70 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
              {metrics.founder_summary.report_text}
            </pre>
            <p className="text-[10px] text-luxe/40 mt-3">
              API: <code className="text-luxe/55">GET /api/admin/validation-report?days=7|30</code>
            </p>
          </section>

          <p className="text-[10px] text-luxe/40 text-right">
            Updated {new Date(metrics.generated_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}
