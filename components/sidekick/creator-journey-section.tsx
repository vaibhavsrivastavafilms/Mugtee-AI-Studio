'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  computeGoalProgress,
  resolveCreatorJourney,
  type CreatorJourneySnapshot,
} from '@/lib/sidekick/creator-journey'
import { fetchCreatorMemoryProfile } from '@/lib/creator/creator-memory'
import { buildTodaysBrief } from '@/lib/sidekick/todays-brief'

export function CreatorJourneySection({ className }: { className?: string }) {
  const [journey, setJourney] = useState<CreatorJourneySnapshot | null>(null)
  const [goalProgress, setGoalProgress] = useState({ percent: 0, label: '' })
  const [milestone, setMilestone] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      const profile = await fetchCreatorMemoryProfile()
      const brief = buildTodaysBrief(profile, null)
      if (alive) setMilestone(brief.nextMilestone)

      try {
        const res = await fetch('/api/usage', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { used?: { projects?: number; generations?: number } }
        const projects = Number(data?.used?.projects) || 0
        const generations = Number(data?.used?.generations) || 0
        if (alive) {
          setJourney(resolveCreatorJourney(projects, generations))
          setGoalProgress(computeGoalProgress(profile.creatorGoal, projects))
        }
      } catch {
        if (alive) {
          setJourney(resolveCreatorJourney(0, 0))
          setGoalProgress(computeGoalProgress(profile.creatorGoal, 0))
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const tiers = useMemo(
    () => ['beginner', 'builder', 'grower', 'authority', 'icon'] as const,
    []
  )
  const activeIdx = journey ? tiers.indexOf(journey.level) : 0

  if (!journey) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-black/30 p-5 sm:p-6 space-y-4',
        className
      )}
    >
      <div>
        <p className="text-[10px] tracking-[0.32em] uppercase text-gold-300/75 mb-1">
          Creator progress
        </p>
        <h2 className="font-display text-lg text-luxe">{journey.label}</h2>
        <p className="text-xs text-luxe/55 mt-1">{journey.description}</p>
      </div>

      <ol className="flex items-center gap-1 sm:gap-2" aria-label="Creator journey levels">
        {tiers.map((tier, i) => {
          const active = i === activeIdx
          const done = i < activeIdx
          return (
            <li key={tier} className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition capitalize',
                  active
                    ? 'border-gold-500/50 bg-gold-500/20 text-gold-100 shadow-[0_0_16px_-4px_rgba(212,175,55,0.5)]'
                    : done
                      ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200/90'
                      : 'border-white/[0.08] text-luxe/35'
                )}
                title={tier}
              >
                {i + 1}
              </span>
              {i < tiers.length - 1 ? (
                <span
                  className={cn(
                    'h-px flex-1 min-w-[8px] rounded-full',
                    done ? 'bg-emerald-500/40' : active ? 'bg-gold-500/30' : 'bg-white/[0.06]'
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          )
        })}
      </ol>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-[10px] tracking-[0.16em] uppercase">
          <span className="text-luxe/45">{goalProgress.label}</span>
          <span className="text-gold-300/70">{goalProgress.percent}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gold-gradient transition-all duration-700"
            style={{ width: `${goalProgress.percent}%` }}
          />
        </div>
      </div>

      <p className="text-[11px] text-luxe/45">
        <span className="text-luxe/35 uppercase tracking-[0.12em] text-[10px] mr-2">
          Next milestone
        </span>
        {milestone || journey.progressHint}
      </p>
    </motion.section>
  )
}
