'use client'

import { useEffect, useState } from 'react'
import type { HallOfFameCache, LegendaryProjectRef, CreatorReputation } from '@/lib/multiverse/types'
import { ReputationRankBadge } from '@/components/multiverse/reputation-rank-badge'
import { LegendaryProjectBadge } from '@/components/multiverse/legendary-project-badge'
import { cn } from '@/lib/utils'
import { Trophy } from 'lucide-react'

type HallResponse = {
  hallOfFame: HallOfFameCache
  legendaryProjects: LegendaryProjectRef[]
  highlights: string[]
  reputation: CreatorReputation
}

export function HallOfFamePanel({ className }: { className?: string }) {
  const [data, setData] = useState<HallResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetch('/api/multiverse/hall-of-fame', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d?.ok ? setData(d) : null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-gold-400" />
          <div>
            <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/70">Hall of Fame</p>
            <h3 className="font-display text-lg text-luxe/90">Your best work</h3>
          </div>
        </div>
        {data?.reputation ? <ReputationRankBadge reputation={data.reputation} /> : null}
      </div>

      {loading ? (
        <p className="text-sm text-luxe/45">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {data?.hallOfFame.bestStoryScore != null && (
              <StatCard label="Best score" value={String(data.hallOfFame.bestStoryScore)} />
            )}
            {data?.hallOfFame.longestStreak != null && (
              <StatCard label="Longest streak" value={`${data.hallOfFame.longestStreak}d`} />
            )}
            {data?.hallOfFame.totalExports != null && (
              <StatCard label="Exports" value={String(data.hallOfFame.totalExports)} />
            )}
            {data?.hallOfFame.topAchievement && (
              <StatCard label="Achievement" value={data.hallOfFame.topAchievement} small />
            )}
          </div>

          {data?.legendaryProjects?.length ? (
            <div className="flex flex-wrap gap-2">
              {data.legendaryProjects.slice(0, 5).map((p) => (
                <LegendaryProjectBadge key={p.projectId} title={p.title} score={p.score} />
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-luxe/45">
              Export a project with story score 85+ to earn a legendary badge.
            </p>
          )}
        </>
      )}
    </section>
  )
}

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-gold-500/15 bg-gold-500/[0.04] p-3">
      <p className="text-[9px] tracking-[0.2em] uppercase text-luxe/45 mb-0.5">{label}</p>
      <p className={cn('font-display text-luxe/90', small ? 'text-sm truncate' : 'text-xl')}>{value}</p>
    </div>
  )
}
