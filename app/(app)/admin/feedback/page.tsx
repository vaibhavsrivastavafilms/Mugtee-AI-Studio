'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import type { FeedbackSummary } from '@/app/api/feedback/summary/route'
import { cn } from '@/lib/utils'

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

function RankList({
  title,
  items,
  empty,
}: {
  title: string
  items: { label: string; count: number }[]
  empty: string
}) {
  return (
    <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <h2 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-luxe/45">{empty}</p>
      ) : (
        <ul className="space-y-1.5 text-sm text-luxe/80">
          {items.map((row) => (
            <li key={row.label} className="flex justify-between gap-2">
              <span className="truncate">{row.label}</span>
              <span className="text-gold-300/90 tabular-nums shrink-0">{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function AdminFeedbackPage() {
  const [summary, setSummary] = useState<FeedbackSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(90)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const res = await fetch(`/api/feedback/summary?days=${days}`, { cache: 'no-store' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          if (!cancelled) {
            setError(
              res.status === 403
                ? 'Admin access required (set ADMIN_EMAILS or ADMIN_USER_IDS).'
                : String((body as { error?: string }).error || res.statusText)
            )
          }
          return
        }
        const data = await res.json()
        if (!cancelled) setSummary((data as { summary?: FeedbackSummary }).summary ?? null)
      } catch (e) {
        if (!cancelled) setError((e as Error).message || 'Failed to load feedback')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [days])

  const { helpful, needs_improvement, helpful_pct } = summary?.output_rating ?? {
    helpful: 0,
    needs_improvement: 0,
    helpful_pct: 0,
  }

  return (
    <div className="max-w-5xl mx-auto w-full">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-luxe/60 hover:text-luxe transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Founder Dashboard
        </Link>
        <label className="ml-auto flex items-center gap-2 text-xs text-luxe/50">
          Window
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-luxe/80"
          >
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
          </select>
        </label>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl text-luxe mb-1">Creator feedback</h1>
      <p className="text-sm text-luxe/55 mb-6">
        Output ratings, export readiness, and suggestions — ranked for product prioritization.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-luxe/50 py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <p className="text-sm text-red-300/90 py-8 text-center">{error}</p>
      ) : summary && !summary.table_available ? (
        <p className="text-sm text-luxe/50 py-8 text-center">
          Run migration{' '}
          <code className="text-luxe/70">0040_creator_feedback.sql</code> to enable moment-of-use
          feedback.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Responses" value={summary?.total ?? 0} hint={`Last ${days} days`} />
            <MetricCard label="Helpful %" value={`${helpful_pct}%`} hint={`${helpful} helpful`} />
            <MetricCard
              label="Needs work"
              value={needs_improvement}
              hint="Output ratings"
            />
            <MetricCard
              label="Major edits"
              value={
                summary?.export_satisfaction.find((e) => e.key === 'major_edits')?.count ?? 0
              }
              hint="Export feedback"
            />
          </div>

          <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
            <h2 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">
              Prioritization queue
            </h2>
            {(summary?.priority_queue.length ?? 0) === 0 ? (
              <p className="text-sm text-luxe/45">No ranked signals yet.</p>
            ) : (
              <ul className="space-y-2">
                {summary?.priority_queue.slice(0, 12).map((item, i) => (
                  <li
                    key={`${item.kind}-${item.key}`}
                    className="flex items-center gap-3 text-sm border-b border-white/[0.05] pb-2 last:border-0"
                  >
                    <span className="text-gold-300/80 tabular-nums w-5 shrink-0">{i + 1}</span>
                    <span className="flex-1 text-luxe/85 truncate">{item.label}</span>
                    <span className="text-luxe/45 text-xs shrink-0">{item.count}×</span>
                    <span
                      className={cn(
                        'text-[10px] uppercase tracking-wider shrink-0',
                        item.severity >= 3 ? 'text-amber-300/90' : 'text-luxe/40'
                      )}
                    >
                      sev {item.severity}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid sm:grid-cols-2 gap-4">
            <RankList
              title="Most common complaints"
              items={(summary?.top_complaints ?? []).map((c) => ({
                label: c.label,
                count: c.count,
              }))}
              empty="No improvement reasons yet."
            />
            <RankList
              title="Export satisfaction"
              items={(summary?.export_satisfaction ?? []).map((e) => ({
                label: e.label,
                count: e.count,
              }))}
              empty="No export feedback yet."
            />
          </div>

          <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
            <h2 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">
              Recent suggestions
            </h2>
            {(summary?.recent_suggestions.length ?? 0) === 0 ? (
              <p className="text-sm text-luxe/45">No suggestions yet.</p>
            ) : (
              <ul className="space-y-3">
                {summary?.recent_suggestions.map((s) => (
                  <li key={s.id} className="text-sm text-luxe/75 border-b border-white/[0.05] pb-2">
                    <p className="line-clamp-3">{s.text}</p>
                    <p className="text-[10px] text-luxe/40 mt-1">
                      {new Date(s.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
