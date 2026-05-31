'use client'

import { motion } from 'framer-motion'
import { Bot, Clapperboard, Download, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const BADGES = [
  { key: 'ai-powered', label: 'AI-Powered', icon: Bot },
  { key: 'creator-focused', label: 'Creator-Focused', icon: Users },
  { key: 'export-ready', label: 'Export Ready', icon: Download },
  { key: 'faceless', label: 'Built for Faceless Creators', icon: Clapperboard },
] as const

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
}

export function TrustBadgesStrip({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'relative px-5 sm:px-6 py-6 sm:py-8 border-b border-[var(--v2-border,rgba(255,255,255,0.06))]',
        className
      )}
      aria-label="Platform trust highlights"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          {...fadeUp}
          className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
        >
          {BADGES.map((badge, index) => {
            const Icon = badge.icon
            return (
              <motion.span
                key={badge.key}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: index * 0.04 }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                  'border border-[var(--v2-border,rgba(255,255,255,0.1))]',
                  'bg-[var(--v2-surface,rgba(255,255,255,0.03))]',
                  'text-[10px] sm:text-[11px] tracking-[0.12em] uppercase',
                  'text-[var(--v2-text-secondary,rgba(244,231,193,0.65))]'
                )}
              >
                <Icon
                  className="w-3.5 h-3.5 text-[var(--v2-gold,#d4af37)]/75 shrink-0"
                  aria-hidden
                />
                {badge.label}
              </motion.span>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
