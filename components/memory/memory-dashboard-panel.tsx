'use client'

import { useEffect } from 'react'
import { Brain, Sparkles, TrendingUp, Users, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreatorMemoryStore } from '@/stores/creator-memory-store'
import { dashboardInsights } from '@/lib/memory/companion-messages'
import { topNodesByType } from '@/lib/memory/knowledge-graph'
import { normalizeThemeLabel } from '@/lib/cinematic/hook-format'
import { relationshipLabel, relationshipProgress } from '@/lib/memory/relationship-score'
import { RelationshipBadge } from '@/components/memory/relationship-badge'
import { CreatorTimeline } from '@/components/memory/creator-timeline'

type MemoryDashboardPanelProps = {
  className?: string
  compact?: boolean
}

function dedupeThemes(themes: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of themes) {
    const label = normalizeThemeLabel(raw)
    const key = label.toLowerCase()
    if (!label || seen.has(key)) continue
    seen.add(key)
    out.push(label)
  }
  return out
}

export function MemoryDashboardPanel({ className, compact }: MemoryDashboardPanelProps) {
  const profile = useCreatorMemoryStore((s) => s.profile)
  const hydrate = useCreatorMemoryStore((s) => s.hydrate)
  const refreshTimeline = useCreatorMemoryStore((s) => s.refreshTimeline)

  useEffect(() => {
    void hydrate()
    void refreshTimeline()
  }, [hydrate, refreshTimeline])

  const insights = dashboardInsights(profile)
  const hooks = topNodesByType(profile.memoryGraph, 'hook', 5)
  const themes = dedupeThemes(profile.creatorMemory.commonThemes ?? [])
  const progress = relationshipProgress(profile.relationshipScore)
  const dna = profile.creatorDna

  return (
    <div className={cn('space-y-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-gold-400" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80">
              Companion Memory
            </span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl text-[#F4E7C1]">
            Mugtee knows you
          </h2>
          <p className="text-xs text-luxe/55 mt-1">
            DNA, hooks, and patterns learned across sessions.
          </p>
        </div>
        <RelationshipBadge level={profile.relationshipLevel} score={profile.relationshipScore} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DnaCard dna={dna} />
        <InsightCard
          icon={Users}
          title="Audience insights"
          body={insights.audienceInsight}
        />
        <InsightCard
          icon={Zap}
          title="Best hooks"
          body={
            hooks.length
              ? hooks.map((h) => h.label).join(' · ')
              : 'Accept hooks without regenerating — Mugtee learns your favorites.'
          }
        />
        <InsightCard
          icon={Sparkles}
          title="Favourite formats"
          body={
            insights.topFormats.length
              ? insights.topFormats.join(' · ')
              : profile.preferences.platform ?? 'Quick Cut'
          }
        />
        <InsightCard
          icon={TrendingUp}
          title="Growth trends"
          body={insights.growthTrend}
        />
        <div className="rounded-xl border border-gold-500/20 bg-gold-500/[0.04] p-4">
          <p className="text-[10px] tracking-wider uppercase text-gold-400/70 mb-2">
            Relationship
          </p>
          <p className="text-sm text-luxe/85 font-medium">
            {relationshipLabel(progress.level)}
          </p>
          {progress.nextLevel ? (
            <div className="mt-2">
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-gold-gradient rounded-full transition-all"
                  style={{ width: `${Math.round(progress.progress * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-luxe/45 mt-1">
                {progress.pointsToNext} pts to {relationshipLabel(progress.nextLevel!)}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {themes.length > 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[10px] tracking-wider uppercase text-luxe/45 mb-2">Top themes</p>
          <div className="flex flex-wrap gap-2">
            {themes.map((t) => (
              <span
                key={t}
                className="text-xs px-2.5 py-1 rounded-full border border-gold-500/20 text-gold-200/90 bg-gold-500/[0.06]"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {!compact ? <CreatorTimeline /> : null}
    </div>
  )
}

function DnaCard({ dna }: { dna: ReturnType<typeof useCreatorMemoryStore.getState>['profile']['creatorDna'] }) {
  const fields = [
    { label: 'Creator type', value: dna.creatorType },
    { label: 'Audience', value: dna.audience },
    { label: 'Format', value: dna.format },
    { label: 'Emotional trigger', value: dna.emotionalTrigger },
    { label: 'Voice', value: dna.voice },
    { label: 'Visual style', value: dna.visualStyle },
  ].filter((f) => f.value)

  return (
    <div className="rounded-xl border border-gold-500/20 bg-gold-500/[0.04] p-4 sm:col-span-2">
      <p className="text-[10px] tracking-wider uppercase text-gold-400/70 mb-3">Creator DNA</p>
      {fields.length ? (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          {fields.map((f) => (
            <div key={f.label}>
              <dt className="text-[10px] text-luxe/40 uppercase tracking-wide">{f.label}</dt>
              <dd className="text-sm text-luxe/80 truncate">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-luxe/50">
          Complete projects and exports — Mugtee builds your DNA automatically.
        </p>
      )}
    </div>
  )
}

function InsightCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Brain
  title: string
  body: string
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-gold-400/80" />
        <p className="text-[10px] tracking-wider uppercase text-luxe/45">{title}</p>
      </div>
      <p className="text-sm text-luxe/75 leading-snug">{body}</p>
    </div>
  )
}
