'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import {
  JOURNEY,
  CREATOR_IDENTITY,
  STORY_UNIVERSE,
  IMMERSIVE_VIEWING,
  OPERATING_SYSTEM,
} from '@/lib/marketing/site-copy'

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
}

export function CinematicJourneySection() {
  return (
    <section id="journey" className="relative px-5 sm:px-6 py-20 sm:py-28">
      <div className="container max-w-6xl mx-auto">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
          <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">{JOURNEY.eyebrow}</div>
          <h2 className="font-display text-3xl sm:text-4xl leading-tight">
            From emotional idea to{' '}
            <span className="text-gold-gradient">cinematic universe</span>.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-luxe/65 leading-relaxed">{JOURNEY.subheadline}</p>
        </motion.div>

        <div className="relative max-w-3xl mx-auto">
          <div className="absolute left-[11px] sm:left-1/2 sm:-translate-x-px top-3 bottom-3 w-px bg-gradient-to-b from-transparent via-gold-500/35 to-transparent" />
          <div className="space-y-6 sm:space-y-8">
            {JOURNEY.stages.map((stage, i) => (
              <motion.div
                key={stage.label}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: Math.min(i * 0.04, 0.28) }}
                className="relative pl-10 sm:pl-0 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-8 sm:items-start"
              >
                <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-1.5 w-[22px] h-[22px] rounded-full bg-background border border-gold-500/40 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold-400/80" />
                </div>
                <div className={`${i % 2 === 0 ? 'sm:text-right sm:pr-4' : 'sm:col-start-3 sm:text-left sm:pl-4'} ${i % 2 === 1 ? 'sm:col-start-3' : 'sm:col-start-1'}`}>
                  <div className="text-[10px] tracking-[0.28em] uppercase text-gold-300/80 mb-1">{stage.label}</div>
                  <p className="text-sm sm:text-[15px] text-luxe/70 leading-relaxed max-w-sm sm:max-w-none">{stage.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function PhilosophySection({
  id,
  copy,
  reversed = false,
}: {
  id: string
  copy: { eyebrow: string; headline: string; subheadline: string; lines: readonly string[] }
  reversed?: boolean
}) {
  return (
    <section id={id} className="relative px-5 sm:px-6 py-16 sm:py-24 border-t border-white/[0.04]">
      <div className="container max-w-6xl mx-auto">
        <motion.div
          {...fadeUp}
          className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${reversed ? 'lg:[&>*:first-child]:order-2' : ''}`}
        >
          <div>
            <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">{copy.eyebrow}</div>
            <h2 className="font-display text-3xl sm:text-4xl leading-tight mb-4">{copy.headline}</h2>
            <p className="text-sm sm:text-base text-luxe/65 leading-relaxed">{copy.subheadline}</p>
          </div>
          <div className="space-y-3">
            {copy.lines.map((line) => (
              <div
                key={line}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 text-sm text-luxe/75 leading-relaxed story-experience-depth"
              >
                {line}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export function CreatorIdentitySection() {
  return <PhilosophySection id="identity" copy={CREATOR_IDENTITY} />
}

export function StoryUniverseSection() {
  return <PhilosophySection id="universe" copy={STORY_UNIVERSE} reversed />
}

export function ImmersiveViewingSection() {
  return <PhilosophySection id="presentation" copy={IMMERSIVE_VIEWING} />
}

export function StorytellingOperatingSystemSection() {
  return (
    <section id="philosophy" className="relative px-5 sm:px-6 py-20 sm:py-28">
      <div className="container max-w-6xl mx-auto">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
          <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">{OPERATING_SYSTEM.eyebrow}</div>
          <h2 className="font-display text-3xl sm:text-[2.75rem] leading-tight">
            {OPERATING_SYSTEM.headline.split(' ').slice(0, 3).join(' ')}{' '}
            <span className="text-gold-gradient">
              {OPERATING_SYSTEM.headline.split(' ').slice(3).join(' ')}
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-luxe/65 leading-relaxed">{OPERATING_SYSTEM.subheadline}</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-5xl mx-auto">
          {OPERATING_SYSTEM.pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: (i % 3) * 0.05 }}
              className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-5 sm:p-6 hover:border-gold-500/25 transition story-operating-layer"
            >
              <div className="font-display text-lg text-luxe mb-2">{pillar.title}</div>
              <p className="text-[13px] text-luxe/60 leading-relaxed">{pillar.body}</p>
            </motion.div>
          ))}
        </div>

        <motion.div {...fadeUp} className="mt-14 text-center">
          <Link
            href="/login?next=%2Fcinematic%2Fcreate"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gold-gradient text-black text-sm font-medium shadow-gold-glow hover:opacity-90 transition"
          >
            <Sparkles className="w-4 h-4" /> Enter the cinematic studio
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
