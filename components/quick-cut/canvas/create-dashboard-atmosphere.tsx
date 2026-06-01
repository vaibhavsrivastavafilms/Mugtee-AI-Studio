'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/** Minimal cinematic backdrop for the create dashboard — no scene previews or hero clutter. */
export function CreateDashboardAtmosphere({ className }: { className?: string }) {
  return (
    <div
      className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#050505]', className)}
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,#1a1410_0%,#0a0807_45%,#050505_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_0%_50%,rgba(212,175,55,0.05)_0%,transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_45%_at_100%_60%,rgba(80,60,40,0.04)_0%,transparent_50%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/15 to-transparent" />

      <motion.div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[min(1100px,140vw)] h-[min(900px,90vh)] rounded-full bg-gold-500/[0.05] blur-[140px]"
        animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.04, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-[min(600px,80vw)] h-[min(500px,60vh)] rounded-full bg-amber-900/[0.05] blur-[100px]"
        animate={{ opacity: [0.2, 0.35, 0.2], x: [0, -12, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="absolute inset-0 film-grain opacity-[0.18]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/85 to-transparent" />
    </div>
  )
}
