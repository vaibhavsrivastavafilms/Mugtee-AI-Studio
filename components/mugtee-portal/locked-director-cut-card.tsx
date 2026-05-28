'use client'

import { motion } from 'framer-motion'
import { Clapperboard, Film, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DIRECTOR_CUT_FEATURES,
  DIRECTOR_CUT_LOCKED_COPY,
} from '@/lib/features/director-cut-lock'
import { DirectorPreviewGallery } from '@/components/mugtee-portal/director-preview-gallery'
import { ModeEntryCta } from '@/components/mugtee-portal/mode-entry-cta'

export function LockedDirectorCutCard() {
  return (
    <motion.article
      className={cn(
        'group relative flex flex-col min-h-[42vh] lg:min-h-0 lg:h-full',
        'px-6 sm:px-10 py-10 lg:py-12 overflow-hidden',
        'bg-gradient-to-bl from-[#030303] via-[#060606] to-black',
        'transition-colors duration-500'
      )}
      whileHover="hover"
      initial="rest"
      variants={{ rest: {}, hover: {} }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_70%_75%,rgba(212,175,55,0.14)_0%,transparent_60%)]"
        variants={{ rest: { opacity: 0.35 }, hover: { opacity: 1 } }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />

      <motion.div
        className="pointer-events-none absolute inset-0 opacity-40"
        animate={{ opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'linear-gradient(105deg, transparent 40%, rgba(212,175,55,0.08) 50%, transparent 60%)',
          backgroundSize: '200% 100%',
        }}
        variants={{
          rest: { backgroundPosition: '200% 0' },
          hover: { backgroundPosition: '-200% 0' },
        }}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent backdrop-blur-[1px]" />

      <motion.div
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 lg:top-1/2"
        variants={{ rest: { opacity: 0, scale: 0.92 }, hover: { opacity: 1, scale: 1 } }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold-500/30 bg-black/50 backdrop-blur-md shadow-[0_0_40px_rgba(212,175,55,0.2)]">
          <Lock className="h-6 w-6 text-gold-300" />
        </div>
      </motion.div>

      <div className="relative z-[1] max-w-lg mx-auto lg:mx-0 lg:ml-8 w-full flex flex-col gap-6 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-luxe/40">
            <Clapperboard className="w-4 h-4" />
            <span className="text-[10px] tracking-[0.32em] uppercase">
              🎬 {DIRECTOR_CUT_LOCKED_COPY.label}
            </span>
          </div>
          {DIRECTOR_CUT_LOCKED_COPY.badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-gold-500/25 bg-gold-500/[0.06] px-2.5 py-0.5 text-[9px] tracking-[0.22em] uppercase text-gold-300/80"
            >
              {badge}
            </span>
          ))}
        </div>

        <div>
          <h2 className="font-display text-2xl sm:text-3xl text-luxe/85 leading-tight">
            {DIRECTOR_CUT_LOCKED_COPY.headline}
          </h2>
          <p className="mt-3 text-sm text-luxe/40 leading-relaxed">
            {DIRECTOR_CUT_LOCKED_COPY.subtext}
          </p>
          <p className="mt-3 text-[10px] tracking-[0.28em] uppercase text-gold-400/70">
            {DIRECTOR_CUT_LOCKED_COPY.premiumLabel}
          </p>
        </div>

        <DirectorPreviewGallery />

        <ul className="space-y-2 hidden sm:block">
          {DIRECTOR_CUT_FEATURES.slice(0, 3).map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm text-luxe/35 group-hover:text-luxe/55 transition-colors duration-500"
            >
              <Film className="w-3.5 h-3.5 text-gold-500/40 mt-0.5 shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        <motion.div
          variants={{ rest: { scale: 1 }, hover: { scale: 1.015 } }}
          transition={{ duration: 0.5 }}
        >
          <ModeEntryCta
            mode="director"
            label="Unlock Director Mode"
            locked
            lockedParams={{ upgrade: '1' }}
            className={cn(
              'border border-gold-500/35 bg-black/40 text-gold-200/90 opacity-90',
              'hover:opacity-100 hover:border-gold-500/55 hover:shadow-[0_0_40px_rgba(212,175,55,0.18)]'
            )}
          />
        </motion.div>
      </div>
    </motion.article>
  )
}
