'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function CinematicTitleReveal({
  title,
  subtitle,
  className,
}: {
  title: string
  subtitle: string
  className?: string
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={cn('text-center space-y-2', className)}
    >
      <h1 className="font-display text-2xl sm:text-3xl text-[#F4E7C1] tracking-tight">
        {title}
      </h1>
      <div className="inline-flex flex-col items-center gap-1.5">
        <p className="text-sm text-white/45 tracking-wide">{subtitle}</p>
        <motion.span
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="block h-px w-24 sm:w-32 origin-left bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
        />
      </div>
    </motion.header>
  )
}
