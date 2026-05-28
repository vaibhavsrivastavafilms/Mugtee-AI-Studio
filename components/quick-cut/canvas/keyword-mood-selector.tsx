'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { MOOD_KEYWORDS, type MoodKeyword } from '@/components/quick-cut/canvas/types'

export function KeywordMoodSelector({
  selected,
  onToggle,
  className,
}: {
  selected: MoodKeyword[]
  onToggle: (keyword: MoodKeyword) => void
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <p className="text-[9px] tracking-[0.24em] uppercase text-luxe/45 mb-2.5">
        Mood & tone
      </p>
      <div className="flex gap-2 overflow-x-auto scroll-touch pb-1 -mx-1 px-1 snap-x snap-mandatory">
        {MOOD_KEYWORDS.map((keyword) => {
          const active = selected.includes(keyword)
          return (
            <motion.button
              key={keyword}
              type="button"
              onClick={() => onToggle(keyword)}
              whileTap={{ scale: 0.96 }}
              className={cn(
                'snap-start shrink-0 min-h-[36px] px-3.5 rounded-full text-[11px] tracking-wide transition-all border',
                active
                  ? 'border-gold-400/50 bg-gold-gradient text-black shadow-gold-glow font-medium'
                  : 'border-white/[0.08] bg-black/30 text-luxe/65 hover:border-gold-500/25 hover:text-gold-200'
              )}
            >
              {keyword}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
