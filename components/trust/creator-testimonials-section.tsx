'use client'

import { motion } from 'framer-motion'
import { Quote } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** Outcome-focused quotes — role labels only, no fabricated person names. */
const TESTIMONIALS = [
  {
    id: 'scripting-time',
    role: 'Documentary Creator',
    quote:
      'Creators report cutting scripting time from hours to minutes — one topic becomes a full scene arc before the coffee cools.',
  },
  {
    id: 'faceless-workflow',
    role: 'Faceless Channel Owner',
    quote:
      'The hook, script, and caption land in one session. Less tab-switching, more publishing.',
  },
  {
    id: 'storyboard-clarity',
    role: 'Business Reel Creator',
    quote:
      'Storyboard frames give B-roll direction before filming — even when the channel never shows a face.',
  },
  {
    id: 'export-ready',
    role: 'Motivation Channel Creator',
    quote:
      'Export-ready packages mean the reel is structured before editing starts — not after a blank timeline stare-down.',
  },
] as const

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
}

export function CreatorTestimonialsSection({ className }: { className?: string }) {
  return (
    <section
      className={cn('relative px-5 sm:px-6 py-14 sm:py-20', className)}
      aria-labelledby="creator-testimonials-heading"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="text-center mb-10 sm:mb-12 max-w-2xl mx-auto">
          <p className="text-[10px] tracking-[0.32em] uppercase text-[var(--v2-gold,#d4af37)] mb-3">
            Creator outcomes
          </p>
          <h2
            id="creator-testimonials-heading"
            className="font-display text-2xl sm:text-3xl lg:text-4xl text-[var(--v2-text-primary,#F4E7C1)]"
          >
            What creators{' '}
            <span className="italic text-[var(--v2-gold,#d4af37)]">report</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[var(--v2-text-secondary,rgba(244,231,193,0.6))]">
            Anonymous outcome statements — illustrative of typical Mugtee workflows, not individual
            endorsements.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {TESTIMONIALS.map((item, index) => (
            <motion.div
              key={item.id}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: index * 0.05 }}
            >
              <Card
                className={cn(
                  'h-full border-[var(--v2-border,rgba(255,255,255,0.08))]',
                  'bg-gradient-to-br from-[var(--v2-surface,rgba(255,255,255,0.03))] to-black/40',
                  'backdrop-blur-sm overflow-hidden'
                )}
              >
                <CardContent className="p-5 sm:p-6 space-y-4">
                  <Quote
                    className="w-5 h-5 text-[var(--v2-gold,#d4af37)]/50"
                    aria-hidden
                  />
                  <blockquote className="text-sm sm:text-[15px] text-[var(--v2-text-primary,#F4E7C1)] leading-relaxed">
                    &ldquo;{item.quote}&rdquo;
                  </blockquote>
                  <footer>
                    <span
                      className={cn(
                        'inline-flex items-center gap-2 text-[10px] tracking-[0.18em] uppercase',
                        'text-[var(--v2-text-secondary,rgba(244,231,193,0.5))]'
                      )}
                    >
                      <span
                        className="w-6 h-6 rounded-full bg-[var(--v2-gold,#d4af37)]/10 border border-[var(--v2-gold,#d4af37)]/25 flex items-center justify-center text-[8px] text-[var(--v2-gold,#d4af37)]"
                        aria-hidden
                      >
                        ex
                      </span>
                      {item.role}
                      <span className="text-[var(--v2-text-secondary,rgba(244,231,193,0.35))] normal-case tracking-normal">
                        · Creator example
                      </span>
                    </span>
                  </footer>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
