'use client'

import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { useCinematicMotionInitial } from '@/components/home/cinematic-home-motion'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    title: 'Find the spark',
    body: 'Tell Mugtee the messy thought, tiny feeling, or unfinished scene.',
  },
  {
    title: 'Shape the world',
    body: 'Together you explore the mood, story, rhythm, and the pieces around it.',
  },
  {
    title: 'Remember your style',
    body: 'Mugtee keeps your voice, preferences, and project history close.',
  },
  {
    title: 'Finish the feeling',
    body: 'Turn the idea into something you can share without losing the magic.',
  },
] as const

type LandingHowItWorksProps = {
  className?: string
}

export function LandingHowItWorks({ className }: LandingHowItWorksProps) {
  const initial = useCinematicMotionInitial({ opacity: 0, y: 10 })

  return (
    <section id="how-it-works" className={cn('py-14 sm:py-20', className)}>
      <div className="mx-auto max-w-5xl">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">
          How we imagine together
        </p>
        <h2 className="mx-auto mt-4 max-w-3xl text-center font-display text-4xl leading-tight text-white sm:text-5xl">
          Mugtee helps without taking the magic away from you.
        </h2>

        <motion.div
          initial={initial}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          {STEPS.map((step, index) => (
            <Fragment key={step.title}>
              <div className="mugtee-world-card rounded-[1.75rem] border border-[rgba(212,175,55,0.18)] bg-[#191919]/90 p-5 text-left shadow-[0_14px_36px_rgba(0,0,0,0.4)]">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(212,175,55,0.35)] bg-[#141414] text-sm font-semibold text-[#D4AF37]">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-display text-2xl text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#B8B8B8]">{step.body}</p>
              </div>
            </Fragment>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
