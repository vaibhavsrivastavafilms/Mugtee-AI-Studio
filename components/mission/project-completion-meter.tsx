'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function ProjectCompletionMeter({
  percent,
  className,
}: {
  percent: number
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)))

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] tracking-[0.24em] uppercase text-gold-300/75">
          Project Completion
        </p>
        <motion.span
          key={clamped}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          className="text-[11px] text-[var(--v2-gold)] tabular-nums"
        >
          {clamped}%
        </motion.span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
        <motion.div
          initial={false}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-[var(--v2-gold)]/60 via-[var(--v2-gold)] to-[var(--v2-gold)]/80"
        />
      </div>
    </div>
  )
}
