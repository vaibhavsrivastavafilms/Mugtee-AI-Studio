'use client'

import { useEffect, useState } from 'react'
import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCreatorStreak, type CreatorStreakData } from '@/lib/creator/creator-streak'

export function CreatorStreakBadge({
  userId,
  className,
}: {
  userId: string
  className?: string
}) {
  const [streak, setStreak] = useState<CreatorStreakData | null>(null)

  useEffect(() => {
    setStreak(getCreatorStreak(userId))
  }, [userId])

  if (!streak || streak.currentStreak < 1) return null

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 text-[10px] tracking-[0.18em] uppercase text-gold-300/70',
        className
      )}
      title={`Best streak: ${streak.bestStreak} days · ${streak.workflowsCreated} workflows · ${streak.exportsCompleted} exports`}
    >
      <Flame className="w-3 h-3 text-gold-400/80" aria-hidden />
      <span>
        {streak.currentStreak} day{streak.currentStreak === 1 ? '' : 's'}
      </span>
      {streak.bestStreak > streak.currentStreak ? (
        <span className="text-luxe/35 normal-case tracking-normal">
          · best {streak.bestStreak}
        </span>
      ) : null}
    </div>
  )
}
