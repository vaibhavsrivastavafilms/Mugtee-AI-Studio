'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ACHIEVEMENTS, type AchievementId } from '@/lib/mission/achievements'
import { useMissionStore } from '@/stores/mission-store'

export function AchievementToast() {
  const sessionAchievements = useMissionStore((s) => s.sessionAchievements)
  const [visible, setVisible] = useState<AchievementId | null>(null)
  const [queue, setQueue] = useState<AchievementId[]>([])

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
    if (visible || queue.length === 0) return
    const [next, ...rest] = queue
    setVisible(next!)
    setQueue(rest)
    const t = window.setTimeout(() => setVisible(null), 4200)
    return () => window.clearTimeout(t)
  }, [queue, visible])

  const achievement = visible ? ACHIEVEMENTS[visible] : null

  return (
    <AnimatePresence>
      {achievement ? (
        <motion.div
          key={achievement.id}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] pointer-events-none"
        >
          <div className="rounded-2xl border border-[var(--v2-gold)]/40 bg-black/90 backdrop-blur-md px-5 py-3 shadow-gold-glow flex items-center gap-3">
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
