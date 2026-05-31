'use client'

import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Qualitative social validation — no public /api/stats endpoint exists.
 * Metrics omitted per trust policy; swap when live aggregates ship.
 */
export function SocialValidationBar({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'relative px-5 sm:px-6 py-10 sm:py-12 border-t border-[var(--v2-border,rgba(255,255,255,0.06))]',
        'bg-[var(--v2-surface,rgba(255,255,255,0.02))]',
        className
      )}
      aria-label="Creator community validation"
    >
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <Users
            className="w-5 h-5 mx-auto mb-3 text-[var(--v2-gold,#d4af37)]/70"
            aria-hidden
          />
          <p className="font-display text-lg sm:text-xl text-[var(--v2-text-primary,#F4E7C1)] leading-snug">
            Creators are using Mugtee to generate content faster.
          </p>
          <p className="mt-2 text-sm text-[var(--v2-text-secondary,rgba(244,231,193,0.55))]">
            Join creators building with Mugtee — hooks, scripts, storyboards, and captions in one
            workflow.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
