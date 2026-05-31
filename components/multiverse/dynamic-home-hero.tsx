'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { CreatorHqScene } from '@/components/multiverse/creator-hq-scene'
import { SidekickEvolutionBadge } from '@/components/multiverse/sidekick-evolution-badge'
import { ReputationRankBadge } from '@/components/multiverse/reputation-rank-badge'
import { WorldSelector } from '@/components/multiverse/world-selector'
import { quickCutStudioHref } from '@/lib/create/routes'
import type { CreatorWorldId, CreatorReputation } from '@/lib/multiverse/types'
import type { HomeBriefing } from '@/lib/multiverse/dynamic-home-copy'
import { RecommendedNextMoveCard } from '@/components/decision/recommended-next-move-card'
import { cn } from '@/lib/utils'

type HomeBriefingResponse = {
  briefing: HomeBriefing
  profile: {
    creatorWorld: CreatorWorldId | null
    creatorHqLevel: number
    sidekickEvolutionTier: number
    reputation: CreatorReputation
  }
  hq: { level: number; title: string; visualKey: string }
}

export function DynamicHomeHero({ className }: { className?: string }) {
  const [data, setData] = useState<HomeBriefingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWorldPicker, setShowWorldPicker] = useState(false)

  useEffect(() => {
    void fetch('/api/multiverse/home-briefing', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok) {
          setData(d)
          if (!d.profile?.creatorWorld) setShowWorldPicker(true)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className={cn('rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 animate-pulse', className)}>
        <div className="h-6 w-2/3 bg-white/[0.04] rounded mb-2" />
        <div className="h-4 w-full bg-white/[0.03] rounded" />
      </div>
    )
  }

  if (!data) return null

  const { briefing, profile, hq } = data
  const ctaHref =
    showWorldPicker ?
      '#multiverse-world'
    : quickCutStudioHref({ topic: briefing.ctaTopic?.slice(0, 120) })

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-4', className)}
    >
      <CreatorHqScene hqLevel={hq.level} visualKey={hq.visualKey} title={hq.title} />

      <div className="rounded-2xl border border-gold-500/20 bg-gradient-to-br from-gold-500/[0.08] to-transparent p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <SidekickEvolutionBadge tier={profile.sidekickEvolutionTier} />
          <ReputationRankBadge reputation={profile.reputation} compact />
          {briefing.worldLabel ? (
            <span className="text-[10px] tracking-[0.12em] uppercase text-luxe/50">{briefing.worldLabel} World</span>
          ) : null}
        </div>

        <h1 className="font-display text-2xl sm:text-3xl text-[var(--v2-text-primary)] mb-2">
          {briefing.headline}
        </h1>
        <p className="text-sm text-luxe/65 leading-relaxed max-w-2xl">{briefing.subline}</p>

        <RecommendedNextMoveCard className="mt-4" compact />

        {briefing.nextUnlock ? (
          <p className="text-[10px] text-gold-300/60 mt-2 tracking-wide">{briefing.nextUnlock}</p>
        ) : null}

        <div className="flex flex-wrap gap-2 mt-5">
          {showWorldPicker ? (
            <button
              type="button"
              onClick={() => document.getElementById('multiverse-world')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gold-gradient px-4 py-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-black shadow-gold-glow hover:opacity-90 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {briefing.ctaLabel}
            </button>
          ) : (
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gold-gradient px-4 py-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-black shadow-gold-glow hover:opacity-90 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {briefing.ctaLabel}
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {showWorldPicker && (
        <div id="multiverse-world" className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <WorldSelector
            selected={profile.creatorWorld}
            onSelect={() => setShowWorldPicker(false)}
          />
        </div>
      )}
    </motion.section>
  )
}
