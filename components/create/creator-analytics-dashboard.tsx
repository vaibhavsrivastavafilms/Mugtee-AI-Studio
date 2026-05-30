'use client'

import Link from 'next/link'
import {
  BarChart3,
  Calendar,
  Download,
  Film,
  Layers,
  ScrollText,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreatorAnalytics } from '@/hooks/use-creator-analytics'
import { quickCutStudioHref } from '@/lib/create/routes'
import { DatabaseMigrationBanner } from '@/components/app/database-migration-banner'
import type { CreatorAnalyticsCategoryBreakdown } from '@/lib/creator/analytics-dashboard'

function OverviewCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string
  value: string | number
  icon: typeof Film
  hint?: string
}) {
  return (
    <article className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-black/40 p-4 sm:p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 font-display text-2xl sm:text-3xl text-luxe tabular-nums">
            {value}
          </div>
          {hint ? (
            <p className="mt-1.5 text-[10px] text-muted-foreground leading-relaxed">{hint}</p>
          ) : null}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-500/25 bg-gold-500/[0.08]">
          <Icon className="w-4 h-4 text-gold-300" />
        </div>
      </div>
    </article>
  )
}

function SectionCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string
  icon: typeof BarChart3
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-gold-300" />
        <h2 className="font-display text-base text-luxe">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function CategoryBar({
  row,
  maxCount,
}: {
  row: CreatorAnalyticsCategoryBreakdown
  maxCount: number
}) {
  const width = maxCount > 0 ? (row.count / maxCount) * 100 : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-luxe/85">{row.label}</span>
        <span className="text-gold-200/90 tabular-nums font-medium">{row.count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-black/50 border border-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-gold-gradient transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(row.count > 0 ? 6 : 0, width))}%` }}
        />
      </div>
    </div>
  )
}

function formatExports(value: number | null): string {
  return value === null ? '—' : String(value)
}

export function CreatorAnalyticsDashboard() {
  const { snapshot, loading, tableUnavailable } = useCreatorAnalytics()

  if (loading) {
    return (
      <div className="min-h-[30vh] flex items-center justify-center text-sm text-muted-foreground italic">
        Crunching your creator stats…
      </div>
    )
  }

  if (tableUnavailable) {
    return <DatabaseMigrationBanner />
  }

  if (!snapshot) {
    return (
      <div className="min-h-[30vh] flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">Could not load analytics right now.</p>
        <Link
          href={quickCutStudioHref()}
          className="text-xs text-gold-300 hover:text-gold-200 transition"
        >
          Start a new project
        </Link>
      </div>
    )
  }

  const { overview, categories, activity, milestone } = snapshot
  const maxCategory = Math.max(1, ...categories.map((row) => row.count))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/80 mb-1">
            Phase 3.4
          </p>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            Your studio output at a glance — aggregated from saved Mugtee projects only. No
            YouTube or Instagram API data.
          </p>
          {snapshot.truncated ? (
            <p className="mt-2 text-[10px] text-muted-foreground/80">
              Showing your {snapshot.sampleSize} most recent projects.
            </p>
          ) : null}
        </div>
        <Link
          href={quickCutStudioHref()}
          className="inline-flex items-center justify-center gap-2 min-h-[40px] px-4 rounded-xl bg-gold-gradient text-black text-xs font-semibold tracking-[0.08em] uppercase shadow-gold-glow hover:opacity-95 transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          New reel
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
        <OverviewCard
          label="Projects Created"
          value={overview.projectsCreated}
          icon={Film}
          hint="All saved studio projects"
        />
        <OverviewCard
          label="Scripts Generated"
          value={overview.scriptsGenerated}
          icon={ScrollText}
          hint="Projects with a non-empty script"
        />
        <OverviewCard
          label="Videos Generated"
          value={overview.videosGenerated}
          icon={TrendingUp}
          hint="Projects with video or reel URL"
        />
        <OverviewCard
          label="Series Created"
          value={overview.seriesCreated}
          icon={Layers}
          hint="Projects linked to a content series"
        />
        <OverviewCard
          label="Exports Downloaded"
          value={formatExports(overview.exportsDownloaded)}
          icon={Download}
          hint={
            overview.exportsDownloaded === null
              ? 'Usage counter unavailable'
              : 'From your profile usage'
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <SectionCard title="Content Breakdown" icon={BarChart3}>
          {categories.every((row) => row.count === 0) ? (
            <p className="text-xs text-muted-foreground italic">
              Create a few reels to see category trends.
            </p>
          ) : (
            <div className="space-y-4">
              {categories.map((row) => (
                <CategoryBar key={row.id} row={row} maxCount={maxCategory} />
              ))}
              <p className="text-[10px] text-muted-foreground pt-1">
                Categories overlap — one project can match multiple buckets.
              </p>
            </div>
          )}
        </SectionCard>

        <div className="space-y-4 sm:space-y-6">
          <SectionCard title="Recent Activity" icon={Calendar}>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gold-500/20 bg-gold-500/[0.06] px-3 py-3">
                <div className="text-[9px] tracking-[0.22em] uppercase text-gold-300/80">
                  Last 7 days
                </div>
                <div className="mt-1 font-display text-2xl text-luxe tabular-nums">
                  {activity.last7Days}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">Projects created</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-3">
                <div className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">
                  Last 30 days
                </div>
                <div className="mt-1 font-display text-2xl text-luxe tabular-nums">
                  {activity.last30Days}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">Projects created</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Creator Milestones" icon={Target}>
            <div className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">
                    Progress
                  </div>
                  <div className="mt-1 font-display text-xl text-luxe">{milestone.label}</div>
                </div>
                <div className="text-sm text-gold-200 tabular-nums">
                  {Math.round(milestone.progress * 100)}%
                </div>
              </div>
              <div className="h-2 rounded-full bg-black/50 border border-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gold-gradient shadow-gold-glow transition-all duration-700"
                  style={{ width: `${milestone.progress * 100}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {[10, 50, 100, 500].map((target) => (
                  <span
                    key={target}
                    className={cn(
                      'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] tracking-wide',
                      milestone.current >= target
                        ? 'border-gold-500/35 bg-gold-500/10 text-gold-200'
                        : 'border-white/[0.08] bg-black/30 text-muted-foreground'
                    )}
                  >
                    {target}
                    {milestone.current >= target ? ' ✓' : ''}
                  </span>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
