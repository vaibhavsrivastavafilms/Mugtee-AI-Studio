'use client'

import { motion } from 'framer-motion'
import { Download, Lightbulb, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    number: '1',
    title: 'Enter Idea',
    description: 'Type your topic or paste a rough concept — Mugtee handles the structure.',
    icon: Lightbulb,
  },
  {
    number: '2',
    title: 'Generate Content',
    description: 'Get hooks, scripts, storyboards, captions, and thumbnail ideas in one session.',
    icon: Sparkles,
  },
  {
    number: '3',
    title: 'Export & Create',
    description: 'Download assets and move straight into filming, editing, or posting.',
    icon: Download,
  },
] as const

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
}

export function HowItWorksSection({ className }: { className?: string }) {
  return (
    <section
      className={cn('relative px-5 sm:px-6 py-12 sm:py-16', className)}
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="text-center mb-8 sm:mb-10">
          <p className="text-[10px] tracking-[0.32em] uppercase text-[var(--v2-gold)] mb-3">
            How it works
          </p>
          <h2
            id="how-it-works-heading"
            className="font-display text-2xl sm:text-3xl text-[var(--v2-text-primary)]"
          >
            Three steps to creator-ready content
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.number}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: index * 0.06 }}
                className={cn(
                  'relative rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)]/50 p-6',
                  'text-center md:text-left'
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-full',
                    'bg-[var(--v2-gold)]/10 border border-[var(--v2-gold)]/30',
                    'font-display text-sm text-[var(--v2-gold)] mb-4'
                  )}
                >
                  {step.number}
                </span>
                <Icon
                  className="h-5 w-5 text-[var(--v2-gold)]/70 mb-3 mx-auto md:mx-0"
                  aria-hidden
                />
                <h3 className="font-display text-lg text-[var(--v2-text-primary)] mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[var(--v2-text-secondary)] leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
