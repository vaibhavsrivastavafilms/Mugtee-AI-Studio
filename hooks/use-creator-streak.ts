'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  getCreatorStreak,
  recordStudioVisit,
  streakMilestoneMessage,
  type CreatorStreakData,
} from '@/lib/creator/creator-streak'

/** Records studio visit on mount and surfaces streak milestone toasts. */
export function useCreatorStreakTracker(userId: string | null | undefined) {
  const trackedRef = useRef(false)

  useEffect(() => {
    if (!userId || trackedRef.current) return
    trackedRef.current = true

    const { newMilestone } = recordStudioVisit(userId)
    if (newMilestone) {
      toast(streakMilestoneMessage(newMilestone), {
        duration: 5000,
        className: 'border-gold-500/30 bg-[#0a0a0a]/95 text-luxe',
      })
    }
  }, [userId])
}

export function useCreatorStreak(userId: string | null | undefined): CreatorStreakData | null {
  if (!userId || typeof window === 'undefined') return null
  return getCreatorStreak(userId)
}
