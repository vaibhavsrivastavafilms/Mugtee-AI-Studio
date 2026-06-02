'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react'
import type { FounderDashboardMetrics } from '@/lib/admin/founder-dashboard-metrics'
import type { FeatureUsageIntelligenceMetrics } from '@/lib/analytics/compute-feature-usage-metrics'

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

function RankList({ title, items }: { title: string; items: { name: string; count: number }[] }) {
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

export default function FounderDashboardPage() {
  const [metrics, setMetrics] = useState<FounderDashboardMetrics | null>(null)
  const [featureUsage, setFeatureUsage] = useState<FeatureUsageIntelligenceMetrics | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [dashRes, featureRes] = await Promise.all([
          fetch('/api/admin/dashboard', { cache: 'no-store' }),
          fetch('/api/admin/feature-usage?days=30', { cache: 'no-store' }),
        ])
        const body = await dashRes.json().catch(() => ({}))
        const featureBody = await featureRes.json().catch(() => ({}))
        if (!dashRes.ok) {
          if (!cancelled) {
            setError(
              dashRes.status === 403
                ? 'Admin access required (set ADMIN_EMAILS or ADMIN_USER_IDS).'
                : String((body as { error?: string }).error || dashRes.statusText)
            )
          }
          return
        }
        if (!cancelled) {
          setMetrics((body as { metrics?: FounderDashboardMetrics }).metrics ?? null)
          if (featureRes.ok) {
            setFeatureUsage(
              (featureBody as { metrics?: FeatureUsageIntelligenceMetrics }).metrics ?? null
            )
          }
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message || 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="max-w-6xl mx-auto w-full pb-12">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs text-luxe/60 hover:text-luxe transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Settings
        </Link>
        <div className="flex items-center gap-4 ml-auto flex-wrap">
          <Link
            href="/admin/analytics"
            className="inline-flex items-center gap-1 text-xs text-gold-300/80 hover:text-gold-300 transition"
          >
            Conversion analytics <ExternalLink className="w-3 h-3" />
          </Link>
          <Link
            href="/admin/export-funnel"
            className="inline-flex items-center gap-1 text-xs text-gold-300/80 hover:text-gold-300 transition"
          >
            MP4 export funnel <ExternalLink className="w-3 h-3" />
          </Link>
          <Link
            href="/admin/validation"
            className="inline-flex items-center gap-1 text-xs text-gold-300/80 hover:text-gold-300 transition"
          >
            30-day validation <ExternalLink className="w-3 h-3" />
          </Link>
          <Link
            href="/admin/referrals"
            className="inline-flex items-center gap-1 text-xs text-gold-300/80 hover:text-gold-300 transition"
          >
            Referrals <ExternalLink className="w-3 h-3" />
          </Link>
          <Link
            href="/admin/feedback"
            className="inline-flex items-center gap-1 text-xs text-gold-300/80 hover:text-gold-300 transition"
          >
            Creator feedback <ExternalLink className="w-3 h-3" />
          </Link>
          <Link
            href="/admin/interviews"
            className="inline-flex items-center gap-1 text-xs text-gold-300/80 hover:text-gold-300 transition"
          >
            Creator interviews <ExternalLink className="w-3 h-3" />
          </Link>
          <Link
            href="/admin/growth-signals"
            className="inline-flex items-center gap-1 text-xs text-gold-300/80 hover:text-gold-300 transition"
          >
            Growth signals <ExternalLink className="w-3 h-3" />
          </Link>
          <Link
            href="/admin/launch-readiness"
            className="inline-flex items-center gap-1 text-xs text-gold-300/80 hover:text-gold-300 transition"
          >
            Launch readiness <ExternalLink className="w-3 h-3" />
          </Link>
          <Link
            href="/admin/launch-checklist"
            className="inline-flex items-center gap-1 text-xs text-gold-300/80 hover:text-gold-300 transition"
          >
            Founder testing <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl text-luxe mb-1">Founder Dashboard</h1>
      <p className="text-sm text-luxe/55 mb-6">
        Internal metrics — profiles, projects, usage, retention, and monetization signals.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-luxe/50 py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading metrics…
        </div>
      ) : error ? (
        <p className="text-sm text-red-300/90 py-8 text-center">{error}</p>
      ) : !metrics ? (
        <p className="text-sm text-luxe/50 py-8 text-center">No metrics available.</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">
              Growth Engine KPIs
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <MetricCard
                label="Weekly active users"
                value={metrics.growth_kpis.weekly_active_users}
                hint="Profiles or projects updated in 7d"
              />
              <MetricCard
                label="Projects created"
                value={metrics.growth_kpis.projects_created}
                hint={`${metrics.growth_kpis.projects_created_this_week} this week · ${metrics.growth_kpis.projects_created_last_week} prior week${
                  metrics.growth_kpis.projects_week_over_week_pct !== null
                    ? ` · ${metrics.growth_kpis.projects_week_over_week_pct > 0 ? '+' : ''}${metrics.growth_kpis.projects_week_over_week_pct}% WoW`
                    : ''
                }`}
              />
              <MetricCard
                label="Exports downloaded"
                value={metrics.growth_kpis.exports_downloaded}
              />
              <MetricCard
                label="Retention (2+ projects)"
                value={metrics.growth_kpis.retention_users_2plus_projects}
                hint="Users with 2 or more projects"
              />
              <MetricCard
                label="Upgrade intent"
                value={
                  metrics.monetization.tables_available.upgrade_waitlist
                    ? metrics.growth_kpis.upgrade_intent
                    : 'N/A'
                }
                hint={
                  metrics.monetization.tables_available.upgrade_waitlist
                    ? 'upgrade_waitlist signups'
                    : 'Run migration 0027_upgrade_waitlist'
                }
              />
            </div>
          </section>

          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">Overview</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard label="Total users" value={metrics.overview.total_users} />
              <MetricCard label="Active (7d)" value={metrics.overview.active_users_7d} />
              <MetricCard label="Projects created" value={metrics.overview.projects_created} />
              <MetricCard label="Scripts generated" value={metrics.overview.scripts_generated} />
              <MetricCard label="Videos generated" value={metrics.overview.videos_generated} />
              <MetricCard label="Exports downloaded" value={metrics.overview.exports_downloaded} />
              <MetricCard
                label="Creator packs"
                value={metrics.overview.exports_downloaded}
                hint={metrics.overview.creator_packs_note}
              />
            </div>
          </section>

          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">Growth</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              <MetricCard label="New users today" value={metrics.growth.new_users_today} />
              <MetricCard label="New users this week" value={metrics.growth.new_users_this_week} />
              <MetricCard label="New users this month" value={metrics.growth.new_users_this_month} />
            </div>
          </section>

          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">Usage</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <RankList title="Top templates (blueprint)" items={metrics.usage.top_templates} />
              <RankList title="Top niches" items={metrics.usage.top_niches} />
              <RankList title="Top director modes" items={metrics.usage.top_director_modes} />
              <RankList title="Content types" items={metrics.usage.content_types} />
            </div>
          </section>

          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">Retention</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              <MetricCard
                label="Returning users (2+ projects)"
                value={metrics.retention.returning_users}
              />
              <MetricCard
                label="Projects per user (avg)"
                value={metrics.retention.projects_per_user_avg}
              />
              <MetricCard
                label="Generations per user (avg)"
                value={metrics.retention.avg_generations_per_user}
              />
            </div>
          </section>

          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">Feedback</h2>
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <MetricCard
                label="Avg rating"
                value={metrics.feedback.avg_rating ?? '—'}
              />
              <MetricCard label="Total feedback" value={metrics.feedback.total_feedback} />
              <MetricCard
                label="Founding creator apps"
                value={metrics.feedback.founding_creator_applications}
              />
            </div>
            {metrics.feedback.feature_requests.length > 0 ? (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 mb-4">
                <h3 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">
                  Recent comments / requests
                </h3>
                <ul className="space-y-2 text-sm text-luxe/75">
                  {metrics.feedback.feature_requests.map((text, i) => (
                    <li key={i} className="border-b border-white/[0.05] pb-2 last:border-0">
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {metrics.feedback.latest.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                      <th className="px-4 py-2 text-[10px] uppercase text-muted-foreground">Rating</th>
                      <th className="px-4 py-2 text-[10px] uppercase text-muted-foreground">Comment</th>
                      <th className="px-4 py-2 text-[10px] uppercase text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.feedback.latest.map((row) => (
                      <tr key={row.id} className="border-b border-white/[0.05]">
                        <td className="px-4 py-2 whitespace-nowrap">{row.rating}/5</td>
                        <td className="px-4 py-2 max-w-md text-luxe/75 line-clamp-2">
                          {row.comment || '—'}
                        </td>
                        <td className="px-4 py-2 text-xs text-luxe/50 whitespace-nowrap">
                          {new Date(row.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-luxe/45">No project feedback yet.</p>
            )}
          </section>

          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">
              Feature Usage Intelligence
            </h2>
            {!featureUsage ? (
              <p className="text-sm text-luxe/45">
                Feature usage metrics unavailable. Run migration 0029_feature_usage_events.
              </p>
            ) : !featureUsage.table_available ? (
              <p className="text-sm text-luxe/45">
                Run migration 0029_feature_usage_events in Supabase, then refresh.
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-luxe/50">
                  Last {featureUsage.window_days} days — internal feature event counts.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <RankList
                    title="Most used features"
                    items={featureUsage.most_used_features.map((r) => ({
                      name: r.feature,
                      count: r.count,
                    }))}
                  />
                  <RankList
                    title="Least used features"
                    items={featureUsage.least_used_features.slice(0, 9).map((r) => ({
                      name: r.feature,
                      count: r.count,
                    }))}
                  />
                </div>
                {featureUsage.retention_proxy.some((r) => r.users_total > 0) ? (
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <h3 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">
                      Retention proxy (% returned: 2+ projects or 2+ days)
                    </h3>
                    <ul className="space-y-1.5 text-sm text-luxe/80">
                      {featureUsage.retention_proxy
                        .filter((r) => r.users_total > 0)
                        .sort((a, b) => b.retention_pct - a.retention_pct)
                        .map((r) => (
                          <li key={r.feature} className="flex justify-between gap-2">
                            <span className="truncate capitalize">
                              {r.feature.replace(/_/g, ' ')}
                            </span>
                            <span className="text-gold-300/90 tabular-nums shrink-0">
                              {r.retention_pct}% ({r.users_returned}/{r.users_total})
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}
                {featureUsage.weekly_trends.length > 0 ? (
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <h3 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">
                      Weekly usage trends
                    </h3>
                    <ul className="space-y-1 text-xs text-luxe/70 max-h-48 overflow-y-auto">
                      {featureUsage.weekly_trends.map((row) => (
                        <li
                          key={`${row.week_start}-${row.feature}`}
                          className="flex justify-between gap-2"
                        >
                          <span className="truncate">
                            {row.week_start} · {row.feature.replace(/_/g, ' ')}
                          </span>
                          <span className="tabular-nums text-gold-300/80">{row.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-luxe/45">No weekly trend data yet.</p>
                )}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-[11px] tracking-[0.15em] uppercase text-gold-300/80 mb-3">Monetization</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard
                label="Pricing visits"
                value={metrics.monetization.revenue_validation.pricing_visits}
                hint={
                  metrics.monetization.revenue_validation.tables_available.revenue_events
                    ? 'revenue_events'
                    : metrics.monetization.revenue_validation.tables_available.analytics_fallback
                      ? 'analytics_events fallback'
                      : 'Run migration 0029_revenue_events'
                }
              />
              <MetricCard
                label="Upgrade clicks"
                value={metrics.monetization.revenue_validation.upgrade_clicks}
              />
              <MetricCard
                label="Conversion rate"
                value={
                  metrics.monetization.revenue_validation.conversion_rate !== null
                    ? `${(metrics.monetization.revenue_validation.conversion_rate * 100).toFixed(1)}%`
                    : '—'
                }
                hint="upgrade clicks ÷ pricing visits"
              />
              <MetricCard
                label="Payment attempts"
                value={metrics.monetization.revenue_validation.payment_attempts}
                hint="Upgrade CTA clicks + waitlist joins"
              />
              <MetricCard
                label="Upgrade waitlist"
                value={
                  metrics.monetization.tables_available.upgrade_waitlist
                    ? metrics.monetization.upgrade_waitlist_total
                    : 'N/A'
                }
                hint={
                  metrics.monetization.tables_available.upgrade_waitlist
                    ? undefined
                    : 'Run migration 0027_upgrade_waitlist'
                }
              />
              <MetricCard
                label="Referral signups"
                value={
                  metrics.monetization.tables_available.referrals
                    ? metrics.monetization.referral_signups
                    : 'N/A'
                }
                hint={
                  metrics.monetization.tables_available.referrals
                    ? undefined
                    : 'Run migration 0026_referrals'
                }
              />
            </div>
            {metrics.monetization.revenue_validation.plan_interest_by_plan.length > 0 ? (
              <div className="mt-3">
                <RankList
                  title="Plan interest (clicks & attempts)"
                  items={metrics.monetization.revenue_validation.plan_interest_by_plan}
                />
              </div>
            ) : null}
            {metrics.monetization.upgrade_waitlist_by_plan.length > 0 ? (
              <div className="mt-3">
                <RankList
                  title="Waitlist signups by plan"
                  items={metrics.monetization.upgrade_waitlist_by_plan}
                />
              </div>
            ) : null}
          </section>

          <p className="text-[10px] text-luxe/40 text-right">
            Updated {new Date(metrics.generated_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}
