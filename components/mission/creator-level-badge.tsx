'use client'

import { useEffect } from 'react'
import { levelFromXp } from '@/lib/mission/creator-levels'
import { useMissionStore } from '@/stores/mission-store'
import { cn } from '@/lib/utils'

export function CreatorLevelBadge({
  className,
  xpOverride,
}: {
  className?: string
  xpOverride?: number
}) {
  const xp = useMissionStore((s) => xpOverride ?? s.profile.creator_xp)
  const streak = useMissionStore((s) => s.profile.mission_streak.count)
  const fetchProfile = useMissionStore((s) => s.fetchProfile)
  const { level, title } = levelFromXp(xp)

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span className="inline-flex items-center rounded-full border border-[var(--v2-gold)]/30 bg-[var(--v2-gold)]/[0.08] px-2 py-0.5 text-[10px] tracking-[0.14em] uppercase text-[var(--v2-gold)]">
        Lv {level} · {title}
      </span>
      {streak > 0 ? (
        <span className="text-[10px] text-orange-300/90 tabular-nums">🔥 {streak} Day Streak</span>
      ) : null}
    </div>
  )
}
