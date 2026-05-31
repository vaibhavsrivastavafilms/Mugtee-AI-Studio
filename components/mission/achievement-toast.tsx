'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { ACHIEVEMENTS, type AchievementId } from '@/lib/mission/achievements'
import { useMissionStore } from '@/stores/mission-store'

const DISMISS_MS = 4500

export function AchievementToast() {
  const sessionAchievements = useMissionStore((s) => s.sessionAchievements)
  const [visible, setVisible] = useState<AchievementId | null>(null)
  const [queue, setQueue] = useState<AchievementId[]>([])
  const dismissTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (sessionAchievements.length === 0) return
    setQueue((prev) => {
      const merged = [...prev]
      for (const id of sessionAchievements) {
        if (!merged.includes(id)) merged.push(id)
      }
      return merged
    })
  }, [sessionAchievements])

  useEffect(() => {
    if (visible !== null || queue.length === 0) return
    const [next, ...rest] = queue
    setVisible(next)
    setQueue(rest)
  }, [queue, visible])

  const dismiss = useCallback(() => {
    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = null
    }
    setVisible(null)
  }, [])

  useEffect(() => {
    if (!visible) return
    dismissTimerRef.current = window.setTimeout(dismiss, DISMISS_MS)
    return () => {
      if (dismissTimerRef.current !== null) {
        window.clearTimeout(dismissTimerRef.current)
        dismissTimerRef.current = null
      }
    }
  }, [visible, dismiss])

  const achievement = visible ? ACHIEVEMENTS[visible] : null

  return (
    <AnimatePresence mode="wait">
      {achievement ? (
        <motion.div
          key={achievement.id}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed left-1/2 -translate-x-1/2 z-[80] bottom-[calc(13.5rem+env(safe-area-inset-bottom))] sm:bottom-[calc(12rem+env(safe-area-inset-bottom))]"
        >
          <div className="relative rounded-2xl border border-[var(--v2-gold)]/40 bg-black/90 backdrop-blur-md px-5 py-3 pr-10 shadow-gold-glow flex items-center gap-3">
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss achievement"
              className="absolute top-2.5 right-2.5 rounded-md p-1 text-luxe/50 hover:text-luxe/90 hover:bg-white/5 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <span className="text-2xl">{achievement.icon}</span>
            <div>
              <p className="text-[10px] tracking-[0.24em] uppercase text-gold-300/80">
                Achievement Unlocked
              </p>
              <p className="text-sm text-luxe font-medium">{achievement.title}</p>
              <p className="text-[11px] text-luxe/55">{achievement.description}</p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
