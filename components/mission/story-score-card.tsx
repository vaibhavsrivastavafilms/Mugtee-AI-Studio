'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { StoryScore } from '@/lib/mission/story-score'

export function StoryScoreCard({ score, className }: { score: StoryScore; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--v2-gold)]/20 bg-black/40 backdrop-blur-sm p-4',
        className
      )}
    >
      <div className="flex items-end justify-between mb-3">
        <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/75">Story Score</p>
        <motion.span
          key={score.overall}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-display text-2xl text-[var(--v2-gold)] tabular-nums"
        >
          {score.overall}
        </motion.span>
      </div>
      <ul className="space-y-2">
        {score.dimensions.map((dim) => (
          <li key={dim.id}>
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="text-luxe/60 uppercase tracking-wider">{dim.label}</span>
              <span className="text-gold-300/80 tabular-nums">{dim.score}</span>
            </div>
            <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${dim.score}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-[var(--v2-gold)]/50 to-[var(--v2-gold)]"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
