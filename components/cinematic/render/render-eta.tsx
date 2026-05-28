'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function RenderETA({
  seconds,
  className,
}: {
  seconds: number
  className?: string
}) {
  if (seconds <= 0) return null

  return (
    <motion.p
      key={seconds}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      className={cn(
        'text-xs text-white/40 tracking-wide text-center',
        className
      )}
    >
      Estimated time remaining:{' '}
      <span className="text-[#C8A24E]/90 tabular-nums">{seconds}</span>{' '}
      {seconds === 1 ? 'second' : 'seconds'}
    </motion.p>
  )
}
