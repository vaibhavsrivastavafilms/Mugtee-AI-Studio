'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function ProjectCompletionMeter({
  percent,
  className,
  compact = false,
}: {
  percent: number
  className?: string
  compact?: boolean
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)))

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('flex items-center justify-between', compact ? 'mb-1' : 'mb-1.5')}>
        <p
          className={cn(
            'tracking-[0.24em] uppercase text-gold-300/75',
            compact ? 'text-[9px] tracking-[0.18em]' : 'text-[10px]'
          )}
        >
          {compact ? 'Mission' : 'Project Completion'}
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
      <div
        className={cn(
          'rounded-full bg-white/[0.08] overflow-hidden',
          compact ? 'h-1' : 'h-1.5'
        )}
      >
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
