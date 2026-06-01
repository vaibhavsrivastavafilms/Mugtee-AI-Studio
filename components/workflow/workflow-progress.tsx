'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function WorkflowProgress({
  percent,
  className,
}: {
  percent: number
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)))

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            initial={false}
            animate={{ width: `${clamped}%` }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full bg-gradient-to-r from-gold-600/70 via-gold-400 to-gold-300 shadow-[0_0_12px_rgba(212,175,55,0.35)]"
          />
        </div>
        <motion.span
          key={clamped}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          className="text-[11px] text-gold-300/90 tabular-nums shrink-0 min-w-[2.5rem] text-right"
        >
          {clamped}%
        </motion.span>
      </div>
    </div>
  )
}
