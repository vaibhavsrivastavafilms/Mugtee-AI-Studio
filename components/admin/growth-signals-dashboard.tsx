'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, ExternalLink, Loader2, Sparkles } from 'lucide-react'
import type { GrowthSignalsMetrics } from '@/lib/admin/growth-signals'

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

function RankList({ title, items, emptyHint }: { title: string; items: { name: string; count: number }[]; emptyHint?: string }) {
  return (
    <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <h2 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-luxe/45">{emptyHint || 'No data yet'}</p>
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

function formatFeature(name: string) {
  return name.replace(/_/g, ' ')
}

export function GrowthSignalsDashboard() {
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<GrowthSignalsMetrics | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/admin/growth-signals?days=${days}`, { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) {
          throw new Error(
            r.status === 403
              ? 'Admin access required (set ADMIN_EMAILS or ADMIN_USER_IDS).'
              : String((data as { error?: string }).error || r.statusText)
          )
        }
        if (!cancelled) setMetrics((data as { metrics?: GrowthSignalsMetrics }).metrics ?? null)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || 'Could not load growth signals')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [days])

  return (
    <div className="max-w-6xl mx-auto w-full pb-12">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-luxe/60 hover:text-luxe transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Founder dashboard
        </Link>
        <Link
          href="/studio/admin"
          className="inline-flex items-center gap-1 text-xs text-gold-300/80 hover:text-gold-300 transition ml-auto"
        >
          Creator validation <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-luxe mb-1">Growth Signal Dashboard</h1>
          <p className="text-sm text-luxe/55">
            Feature usage, retention, revenue correlation, and template/niche trends — last {days} days.
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          aria-label="Analysis window in days"
          className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-luxe"
        >
          {[7, 14, 30, 90].map((d) => (
            <option key={d} value={d}>
              {d} days
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-luxe/50 py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading growth signals…
        </div>
      ) : error ? (
        <p className="text-sm text-red-300/90 py-8 text-center">{error}</p>
      ) : !metrics ? (
        <p className="text-sm text-luxe/50 py-8 text-center">No metrics available.</p>
      ) : (
        <div className="space-y-8">
          {!metrics.tables_available.feature_usage_events || !metrics.tables_available.upgrade_waitlist ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-100/80">
              {!metrics.tables_available.feature_usage_events ? (
                <p>Run migration <code className="text-amber-200/90">0029_feature_usage_events</code> for feature tracking.</p>
              ) : null}
              {!metrics.tables_available.upgrade_waitlist ? (
                <p>Run migration <code className="text-amber-200/90">0027_upgrade_waitlist</code> for revenue correlation.</p>
              ) : null}
            </div>
          ) : null}

          {metrics.founder_insights.length > 0 ? (
            <section>
              <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Founder insights
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {metrics.founder_insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="rounded-xl border border-gold-500/20 bg-gold-500/[0.06] p-4"
                  >
                    <p className="text-[10px] tracking-wider uppercase text-gold-300/70">{insight.title}</p>
                    <p className="font-display text-xl text-luxe mt-1 capitalize">
                      {formatFeature(insight.feature)}{' '}
                      <span className="text-gold-300">{insight.value}</span>
                    </p>
                    <p className="text-[11px] text-luxe/50 mt-2">{insight.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">Feature signals</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <RankList title="Most used features" items={metrics.most_used_features} />
              <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <h2 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">
                  Highest retention (D30)
                </h2>
                {metrics.highest_retention_features.length === 0 ? (
                  <p className="text-sm text-luxe/45">Need ≥3 users per feature</p>
                ) : (
                  <ul className="space-y-1.5 text-sm text-luxe/80">
                    {metrics.highest_retention_features.map((row) => (
                      <li key={row.feature} className="flex justify-between gap-2">
                        <span className="truncate capitalize">{formatFeature(row.feature)}</span>
                        <span className="text-gold-300/90 tabular-nums shrink-0">{row.d30_pct}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <h2 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">
                  Highest revenue correlation
                </h2>
                {metrics.highest_revenue_features.length === 0 ? (
                  <p className="text-sm text-luxe/45">No waitlist + usage overlap yet</p>
                ) : (
                  <ul className="space-y-1.5 text-sm text-luxe/80">
                    {metrics.highest_revenue_features.map((row) => (
                      <li key={row.feature} className="flex justify-between gap-2">
                        <span className="truncate capitalize">{formatFeature(row.feature)}</span>
                        <span className="text-gold-300/90 tabular-nums shrink-0">{row.waitlist_user_pct}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </section>

          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">Content patterns</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <RankList title="Most used templates (blueprintId)" items={metrics.most_used_templates} />
              <RankList title="Most used niches" items={metrics.most_used_niches} />
            </div>
          </section>

          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">
              Retention analysis
            </h2>
            <p className="text-[11px] text-luxe/45 mb-3">
              Retained = another feature event or project activity ≥7/30 days after first use of that feature.
            </p>
            {metrics.retention_analysis.length === 0 ? (
              <p className="text-sm text-luxe/45">No feature usage events in window.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                      <th className="px-4 py-2 text-[10px] uppercase text-muted-foreground">Feature</th>
                      <th className="px-4 py-2 text-[10px] uppercase text-muted-foreground text-right">Usage</th>
                      <th className="px-4 py-2 text-[10px] uppercase text-muted-foreground text-right">D7 %</th>
                      <th className="px-4 py-2 text-[10px] uppercase text-muted-foreground text-right">D30 %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.retention_analysis.map((row) => (
                      <tr key={row.feature} className="border-b border-white/[0.05]">
                        <td className="px-4 py-2 capitalize">{formatFeature(row.feature)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{row.usage_count}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-luxe/80">{row.d7_retention_pct}%</td>
                        <td className="px-4 py-2 text-right tabular-nums text-gold-300/90">{row.d30_retention_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">Revenue analysis</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
              <MetricCard
                label="PRO / paid profiles"
                value={metrics.revenue.pro_users_count}
                hint={metrics.revenue.waitlist_proxy_used ? 'Using waitlist as upgrade proxy' : undefined}
              />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <RankList
                title="Features used 7d before waitlist"
                items={metrics.revenue.features_before_waitlist_7d}
                emptyHint="No waitlist signups with prior usage"
              />
              <RankList
                title={
                  metrics.revenue.waitlist_proxy_used
                    ? 'Features after waitlist (proxy)'
                    : 'Features after upgrade (PRO+)'
                }
                items={metrics.revenue.features_after_upgrade}
                emptyHint="No post-upgrade usage yet"
              />
              <RankList
                title="Top paying segments"
                items={metrics.revenue.top_paying_segments}
                emptyHint="creator_type + plan_interest overlap"
              />
            </div>
          </section>

          <p className="text-[10px] text-luxe/40 text-right">
            Updated {new Date(metrics.generated_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}
