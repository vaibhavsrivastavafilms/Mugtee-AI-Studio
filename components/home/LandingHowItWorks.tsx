'use client'

import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { useCinematicMotionInitial } from '@/components/home/cinematic-home-motion'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    title: 'Talk to Mugtee',
    body: 'Say the messy thought out loud.',
  },
  {
    title: 'Find the Story',
    body: 'Mugtee helps shape the hook, scenes, voice, and feeling.',
  },
  {
    title: 'Make It Together',
    body: 'Adjust the world until it feels like yours.',
  },
  {
    title: 'Share It',
    body: 'Mugtee helps choose the platform, caption, and moment.',
  },
] as const

type LandingHowItWorksProps = {
  className?: string
}

export function LandingHowItWorks({ className }: LandingHowItWorksProps) {
  const initial = useCinematicMotionInitial({ opacity: 0, y: 10 })

  return (
    <section id="how-it-works" className={cn('px-4 py-12 sm:px-6 sm:py-14', className)}>
      <div className="mx-auto max-w-5xl">
        <p className="text-center text-[10px] uppercase tracking-[0.32em] text-[#D4AF37]/70">
          How Friendship Works
        </p>

        <motion.div
          initial={initial}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="mt-8 flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-2"
        >
          {STEPS.map((step, index) => (
            <Fragment key={step.title}>
              <div className="w-full max-w-[220px] text-center lg:max-w-none lg:flex-1 lg:text-left">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#D4AF37]/35 text-[11px] font-medium text-[#D4AF37]">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-[12px] font-medium tracking-wide text-white/90">
                  {step.title}
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-white/45">{step.body}</p>
              </div>
              {index < STEPS.length - 1 ? (
                <span
                  className="text-[#D4AF37]/35 lg:mt-3 lg:shrink-0"
                  aria-hidden
                >
                  <span className="lg:hidden">↓</span>
                  <span className="hidden lg:inline">→</span>
                </span>
              ) : null}
            </Fragment>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
