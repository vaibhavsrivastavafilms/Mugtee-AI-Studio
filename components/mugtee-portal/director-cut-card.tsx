'use client'

import { motion } from 'framer-motion'
import { Clapperboard, Film } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DIRECTOR_CUT_FEATURES } from '@/lib/features/director-cut-lock'
import { DirectorPreviewGallery } from '@/components/mugtee-portal/director-preview-gallery'
import { ModeEntryCta } from '@/components/mugtee-portal/mode-entry-cta'

const TAGS = ['🎬 Director Cut', 'Studio Pro', 'Premium Workflow'] as const

export function DirectorCutCard() {
  return (
    <motion.article
      className={cn(
        'group relative flex flex-col min-h-[42vh] lg:min-h-0 lg:h-full',
        'px-6 sm:px-10 py-10 lg:py-12',
        'bg-gradient-to-bl from-black via-[#080808] to-transparent',
        'transition-colors duration-500'
      )}
      whileHover="hover"
      initial="rest"
      variants={{ rest: {}, hover: {} }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_70%_75%,rgba(120,90,50,0.1)_0%,transparent_60%)] opacity-0"
        variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />

      <div className="relative z-[1] max-w-lg mx-auto lg:mx-0 lg:ml-8 w-full flex flex-col gap-6 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {TAGS.map((tag, i) => (
            <span
              key={tag}
              className={cn(
                'text-[10px] tracking-[0.28em] uppercase',
                i === 0 ? 'flex items-center gap-2 text-luxe/50' : 'rounded-full border border-gold-500/20 bg-gold-500/[0.05] px-2 py-0.5 text-gold-300/75'
              )}
            >
              {i === 0 ? (
                <>
                  <Clapperboard className="w-4 h-4" />
                  {tag}
                </>
              ) : (
                tag
              )}
            </span>
          ))}
        </div>

        <div>
          <h2 className="font-display text-2xl sm:text-3xl text-luxe/90 leading-tight">
            Full cinematic control.
          </h2>
          <p className="mt-3 text-sm text-luxe/45 leading-relaxed">
            Multi-panel workspace for timeline editing, storyboard grids, scene inspection,
            visual direction, and cinematic compile.
          </p>
        </div>

        <DirectorPreviewGallery />

        <ul className="space-y-2 hidden sm:block">
          {DIRECTOR_CUT_FEATURES.slice(0, 3).map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm text-luxe/45 group-hover:text-luxe/60 transition-colors duration-500"
            >
              <Film className="w-3.5 h-3.5 text-luxe/35 mt-0.5 shrink-0" />
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
            className="border border-white/[0.12] bg-white/[0.04] text-luxe/90 hover:border-gold-500/30 hover:bg-white/[0.06] hover:shadow-[0_0_40px_rgba(212,175,55,0.12)]"
          />
        </motion.div>
      </div>
    </motion.article>
  )
}
