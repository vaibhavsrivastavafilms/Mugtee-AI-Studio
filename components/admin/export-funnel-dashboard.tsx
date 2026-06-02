'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import type { ExportFunnelSummary } from '@/lib/analytics/compute-export-funnel'

type FunnelResponse = {
  ok: boolean
  admin?: boolean
  window_days?: number
  funnel?: ExportFunnelSummary
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

export function ExportFunnelDashboard() {
  const [days, setDays] = useState(7)
  const [data, setData] = useState<FunnelResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/export-funnel?days=${days}`, { cache: 'no-store' })
        const body = (await res.json().catch(() => ({}))) as FunnelResponse
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
        if (!cancelled) setError((e as Error).message || 'Failed to load export funnel')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [days])

  const f = data?.funnel

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
          {[7, 14, 30].map((d) => (
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

      <h1 className="font-display text-2xl sm:text-3xl text-luxe mb-1">MP4 export funnel</h1>
      <p className="text-sm text-luxe/55 mb-6">
        Daily founder view — signup → project → storyboard → export click → MP4 start → download.
        Success KPI is <span className="text-gold-300/90">mp4_downloaded</span>.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-luxe/50 py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading funnel…
        </div>
      ) : error ? (
        <p className="text-sm text-red-300/90 py-8 text-center">{error}</p>
      ) : !f ? (
        <p className="text-sm text-luxe/50 py-8 text-center">No funnel data yet.</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">
              Window totals ({f.window_days}d)
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard label="Signups" value={f.totals.signups} />
              <MetricCard label="Projects" value={f.totals.projects} />
              <MetricCard label="Storyboards" value={f.totals.storyboards} />
              <MetricCard label="Export clicks" value={f.totals.export_clicks} hint="export_clicked" />
              <MetricCard label="MP4 started" value={f.totals.mp4_started} />
              <MetricCard label="MP4 completed" value={f.totals.mp4_completed} />
              <MetricCard label="MP4 downloaded" value={f.totals.mp4_downloaded} hint="Success KPI" />
              <MetricCard
                label="Success rate"
                value={`${f.totals.success_rate_pct}%`}
                hint="downloads / started"
              />
            </div>
          </section>

          {f.top_failure ? (
            <section className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
              <h2 className="text-[11px] tracking-[0.15em] uppercase text-amber-300/90 mb-2">
                #1 failure (fix first)
              </h2>
              <p className="text-sm text-luxe">
                <span className="text-amber-200 font-medium">{f.top_failure.error_code}</span>
                <span className="text-luxe/50"> — </span>
                {f.top_failure.count} events
              </p>
              {f.top_failure.latest_message ? (
                <p className="text-[11px] text-luxe/55 mt-2 truncate">
                  Latest: {f.top_failure.latest_message}
                </p>
              ) : null}
            </section>
          ) : null}

          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">
              Error breakdown
            </h2>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/[0.06]">
                    <th className="px-4 py-2">Error code</th>
                    <th className="px-4 py-2 text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {f.top_errors.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-6 text-luxe/45 text-center">
                        No mp4_failed events in window
                      </td>
                    </tr>
                  ) : (
                    f.top_errors.map((row) => (
                      <tr
                        key={row.error_code}
                        className="border-b border-white/[0.04] text-luxe/85"
                      >
                        <td className="px-4 py-2">{row.error_code}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-gold-300/90">
                          {row.count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">
              Daily founder dashboard
            </h2>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-x-auto">
              <table className="w-full text-left text-[11px] min-w-[720px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/[0.06]">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2 text-right">Signups</th>
                    <th className="px-3 py-2 text-right">Projects</th>
                    <th className="px-3 py-2 text-right">Storyboards</th>
                    <th className="px-3 py-2 text-right">Clicks</th>
                    <th className="px-3 py-2 text-right">Started</th>
                    <th className="px-3 py-2 text-right">Completed</th>
                    <th className="px-3 py-2 text-right">Downloads</th>
                    <th className="px-3 py-2 text-right">Success %</th>
                  </tr>
                </thead>
                <tbody>
                  {f.daily.map((row) => (
                    <tr key={row.date} className="border-b border-white/[0.04] text-luxe/80">
                      <td className="px-3 py-2 whitespace-nowrap">{row.date}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.signups}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.projects}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.storyboards}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.export_clicks}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.mp4_started}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.mp4_completed}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gold-300/90">
                        {row.mp4_downloaded}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.success_rate_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
