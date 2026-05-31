'use client'

import { reputationRankLabel } from '@/lib/multiverse/reputation-system'
import type { CreatorReputation, ReputationRank } from '@/lib/multiverse/types'
import { cn } from '@/lib/utils'

const RANK_COLORS: Record<ReputationRank, string> = {
  beginner: 'border-luxe/20 text-luxe/60 bg-white/[0.03]',
  rising: 'border-sky-500/30 text-sky-200/90 bg-sky-500/[0.06]',
  established: 'border-emerald-500/30 text-emerald-200/90 bg-emerald-500/[0.06]',
  notable: 'border-violet-500/30 text-violet-200/90 bg-violet-500/[0.06]',
  elite: 'border-gold-500/40 text-gold-200 bg-gold-500/[0.08]',
  legend: 'border-amber-400/50 text-amber-100 bg-amber-500/[0.12] shadow-[0_0_12px_rgba(212,175,55,0.15)]',
}

export function ReputationRankBadge({
  reputation,
  className,
  compact = false,
}: {
  reputation: CreatorReputation
  className?: string
  compact?: boolean
}) {
  const rank = reputation.rank
  const label = reputationRankLabel(rank)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5',
        'text-[10px] tracking-[0.1em] uppercase',
        RANK_COLORS[rank],
        className
      )}
      title={
        compact ?
          label
        : `Consistency ${reputation.consistency} · Quality ${reputation.quality} · Publishing ${reputation.publishing}`
      }
    >
      {!compact && rank === 'legend' ? '★ ' : null}
      {label}
    </span>
  )
}
