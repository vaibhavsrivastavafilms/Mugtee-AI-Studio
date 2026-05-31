'use client'

import { motion } from 'framer-motion'
import { EmotionalWorldAtmosphere } from '@/components/cinematic/cinematic-storyworld-shell'
import { CinematicBackground } from '@/components/mugtee-portal/cinematic-background'
import { CreateDashboardAtmosphere } from '@/components/quick-cut/canvas/create-dashboard-atmosphere'
import { cn } from '@/lib/utils'

export function CinematicCanvasBackground({
  className,
  variant = 'default',
}: {
  className?: string
  variant?: 'default' | 'create-dashboard'
}) {
  if (variant === 'create-dashboard') {
    return <CreateDashboardAtmosphere className={className} />
  }

  return (
    <div className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)} aria-hidden>
      <CinematicBackground />
      <EmotionalWorldAtmosphere className="opacity-50" />

      <motion.div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[min(1100px,140vw)] h-[min(900px,90vh)] rounded-full bg-gold-500/[0.07] blur-[140px]"
        animate={{ opacity: [0.45, 0.75, 0.45], scale: [1, 1.06, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-[min(600px,80vw)] h-[min(500px,60vh)] rounded-full bg-amber-900/[0.08] blur-[100px]"
        animate={{ opacity: [0.3, 0.55, 0.3], x: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 left-0 w-[min(400px,60vw)] h-[min(400px,50vh)] rounded-full bg-gold-600/[0.04] blur-[80px]"
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      <div className="absolute inset-0 film-grain opacity-[0.35]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-gold-500/[0.04] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />
    </div>
  )
}
