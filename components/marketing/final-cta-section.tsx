'use client'

import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { LuxButton } from '@/components/v2/lux-button'
import { cn } from '@/lib/utils'

const CREATE_HREF = '/studio/create?mode=quick'

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
}

export function FinalCtaSection({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'relative px-5 sm:px-6 py-14 sm:py-20 border-t border-[var(--v2-border)]',
        className
      )}
      aria-labelledby="final-cta-heading"
    >
      <div className="mx-auto max-w-3xl">
        <motion.div
          {...fadeUp}
          className={cn(
            'rounded-2xl border border-[var(--v2-gold)]/25 bg-[var(--v2-surface)]/80',
            'px-6 py-10 sm:px-10 sm:py-12 text-center',
            'shadow-[0_0_60px_rgba(212,175,55,0.08)]'
          )}
        >
          <h2
            id="final-cta-heading"
            className="font-display text-2xl sm:text-3xl lg:text-4xl text-[var(--v2-text-primary)]"
          >
            Ready to Create?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[var(--v2-text-secondary)] max-w-md mx-auto">
            Start with one idea. Leave with hooks, scripts, storyboards, and more — free to try.
          </p>
          <div className="mt-6 flex justify-center">
            <LuxButton href={CREATE_HREF} size="lg" className="rounded-full">
              Start Your First Project Free <ArrowRight className="h-4 w-4" />
            </LuxButton>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
