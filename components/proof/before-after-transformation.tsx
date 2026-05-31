'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Lightbulb, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BEFORE_AFTER_EXAMPLE } from '@/lib/proof/showcase-examples'

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
}

export function BeforeAfterTransformation({ className }: { className?: string }) {
  return (
    <section
      className={cn('relative px-5 sm:px-6 py-12 sm:py-16', className)}
      aria-labelledby="before-after-heading"
    >
      <div className="mx-auto max-w-5xl">
        <motion.div {...fadeUp} className="text-center mb-8 sm:mb-10">
          <div className="text-[10px] tracking-[0.32em] uppercase text-[var(--v2-gold,#d4af37)] mb-3">
            Idea → output
          </div>
          <h2
            id="before-after-heading"
            className="font-display text-xl sm:text-2xl text-[var(--v2-text-primary,#F4E7C1)]"
          >
            One prompt.{' '}
            <span className="italic text-[var(--v2-gold,#d4af37)]">Full cinematic package.</span>
          </h2>
        </motion.div>

        <motion.div
          {...fadeUp}
          className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 lg:gap-6 items-stretch"
        >
          <div className="rounded-2xl border border-[var(--v2-border,rgba(255,255,255,0.08))] bg-[var(--v2-surface,rgba(255,255,255,0.02))] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-[var(--v2-text-secondary,rgba(244,231,193,0.5))] mb-4">
              <Lightbulb className="w-3.5 h-3.5 text-[var(--v2-gold,#d4af37)]/70" aria-hidden />
              Creator idea
            </div>
            <p className="font-display text-lg sm:text-xl text-[var(--v2-text-primary,#F4E7C1)] mb-3">
              {BEFORE_AFTER_EXAMPLE.creatorIdea}
            </p>
            <p className="text-sm text-[var(--v2-text-secondary,rgba(244,231,193,0.55))] italic leading-relaxed">
              &ldquo;{BEFORE_AFTER_EXAMPLE.creatorPrompt}&rdquo;
            </p>
          </div>

          <div className="hidden lg:flex items-center justify-center px-2">
            <div className="w-10 h-10 rounded-full border border-[var(--v2-gold,#d4af37)]/30 bg-[var(--v2-gold,#d4af37)]/10 flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-[var(--v2-gold,#d4af37)]" aria-hidden />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--v2-gold,#d4af37)]/20 bg-[var(--v2-gold,#d4af37)]/[0.04] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-[var(--v2-gold,#d4af37)]/85 mb-4">
              <Sparkles className="w-3.5 h-3.5" aria-hidden />
              Mugtee output
            </div>
            <ul className="space-y-2.5">
              {BEFORE_AFTER_EXAMPLE.mugteeOutput.map((item) => (
                <li
                  key={item.slice(0, 40)}
                  className="flex gap-2 text-[13px] text-[var(--v2-text-primary,#F4E7C1)]/85 leading-relaxed"
                >
                  <span className="mt-2 w-1 h-1 rounded-full bg-[var(--v2-gold,#d4af37)] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
