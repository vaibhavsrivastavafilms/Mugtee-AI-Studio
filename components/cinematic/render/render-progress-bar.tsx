'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function RenderProgressBar({
  progress,
  className,
}: {
  progress: number
  className?: string
}) {
  const clamped = Math.min(100, Math.max(0, progress))

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-[10px] tracking-[0.18em] uppercase">
        <span className="text-white/35">Render progress</span>
        <motion.span
          key={clamped}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          className="text-[#C8A24E] font-medium tabular-nums"
        >
          {clamped}%
        </motion.span>
      </div>
      <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#8B6914] via-[#D4AF37] to-[#E7C56A] shadow-[0_0_16px_rgba(212,175,55,0.35)]"
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
        <div
          className="absolute inset-0 shimmer-cinematic opacity-40 pointer-events-none"
          aria-hidden
        />
        <motion.div
          className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/25 to-transparent"
          animate={{ x: ['-100%', '400%'] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
          style={{ left: `${Math.max(0, clamped - 8)}%` }}
          aria-hidden
        />
      </div>
    </div>
  )
}
