'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Clapperboard, Film } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DIRECTOR_CUT_FEATURES } from '@/lib/features/director-cut-lock'

const FEATURES = DIRECTOR_CUT_FEATURES

export function DirectorCutCard() {
  return (
    <motion.article
      className={cn(
        'group relative flex flex-col justify-end min-h-[42vh] lg:min-h-0 lg:h-full',
        'px-6 sm:px-10 py-10 lg:py-16',
        'bg-gradient-to-bl from-black via-[#080808] to-transparent',
        'transition-colors duration-500'
      )}
      whileHover="hover"
      initial="rest"
      variants={{
        rest: {},
        hover: {},
      }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_70%_75%,rgba(120,90,50,0.08)_0%,transparent_60%)] opacity-0"
        variants={{
          rest: { opacity: 0 },
          hover: { opacity: 1 },
        }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />

      <div className="relative z-[1] max-w-md mx-auto lg:mx-0 lg:ml-8 w-full space-y-6">
        <div className="flex items-center gap-2 text-luxe/45">
          <Clapperboard className="w-4 h-4" />
          <span className="text-[10px] tracking-[0.32em] uppercase">Director Cut</span>
        </div>

        <div>
          <h2 className="font-display text-2xl sm:text-3xl text-luxe/90 leading-tight">
            Full cinematic control.
          </h2>
          <p className="mt-3 text-sm text-luxe/45 leading-relaxed">
            Scene-by-scene directing, pacing refinement, storyboard editing, and cinematic compilation.
          </p>
        </div>

        <ul className="space-y-2.5">
          {FEATURES.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm text-luxe/45 group-hover:text-luxe/60 transition-colors duration-500"
            >
              <Film className="w-3.5 h-3.5 text-luxe/35 mt-0.5 shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        <motion.div variants={{ rest: { scale: 1 }, hover: { scale: 1.015 } }} transition={{ duration: 0.5 }}>
          <Link
            href="/director-cut"
            className={cn(
              'inline-flex w-full sm:w-auto min-h-[52px] items-center justify-center gap-2',
              'px-8 py-3.5 rounded-xl text-[12px] tracking-[0.16em] uppercase font-semibold',
              'border border-white/[0.12] bg-white/[0.04] text-luxe/90',
              'hover:border-gold-500/30 hover:bg-white/[0.06] hover:shadow-[0_0_40px_rgba(212,175,55,0.12)]',
              'transition-all duration-500'
            )}
          >
            Open Director Cut
            <ArrowRight className="w-4 h-4 opacity-70" />
          </Link>
        </motion.div>
      </div>
    </motion.article>
  )
}
