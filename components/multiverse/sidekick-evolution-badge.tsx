'use client'

import { sidekickTierInfo } from '@/lib/multiverse/sidekick-evolution'
import { cn } from '@/lib/utils'

export function SidekickEvolutionBadge({
  tier,
  className,
  showSubtitle = false,
}: {
  tier: number
  className?: string
  showSubtitle?: boolean
}) {
  const info = sidekickTierInfo(tier)

  return (
    <span
      className={cn(
        'inline-flex flex-col gap-0.5 rounded-full border border-gold-500/25',
        'bg-gold-500/[0.06] px-2.5 py-1',
        className
      )}
    >
      <span className="text-[10px] tracking-[0.12em] uppercase text-gold-300/90">
        {info.title}
      </span>
      {showSubtitle ? (
        <span className="text-[9px] text-luxe/45 normal-case tracking-normal">{info.subtitle}</span>
      ) : null}
    </span>
  )
}
