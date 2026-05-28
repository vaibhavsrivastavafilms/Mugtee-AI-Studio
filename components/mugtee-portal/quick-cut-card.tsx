'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { QuickCutCarousel } from '@/components/mugtee-portal/quick-cut-carousel'
import { ModeEntryCta } from '@/components/mugtee-portal/mode-entry-cta'

export function QuickCutCard() {
  return (
    <motion.article
      className={cn(
        'group relative flex flex-col w-full max-w-4xl',
        'px-2 sm:px-4 py-6 sm:py-8',
        'transition-colors duration-500'
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      whileHover="hover"
      variants={{ rest: {}, hover: {} }}
    >
      <motion.div
        className="pointer-events-none absolute -inset-x-8 -top-12 bottom-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_30%,rgba(212,175,55,0.12)_0%,transparent_70%)] opacity-0"
        variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
        transition={{ duration: 0.5 }}
      />

      <div className="relative z-[1] w-full flex flex-col items-center text-center gap-8">
        <div className="space-y-4 max-w-2xl">
          <p className="text-[10px] tracking-[0.36em] uppercase text-gold-300/85">
            Cinematic AI Studio
          </p>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-luxe leading-tight">
            Your Cinematic AI Studio
          </h1>
          <p className="text-lg sm:text-xl text-luxe/75 leading-relaxed">
            Turn one idea into a cinematic reel in seconds.
          </p>
          <p className="text-sm sm:text-base text-luxe/50 leading-relaxed max-w-xl mx-auto">
            Mugtee shapes scripts, visuals, pacing, captions, and cinematic storytelling into
            export-ready short-form content.
          </p>
        </div>

        <QuickCutCarousel />

        <motion.div
          variants={{ rest: { scale: 1 }, hover: { scale: 1.02 } }}
          transition={{ duration: 0.3 }}
          className="pt-2"
        >
          <ModeEntryCta
            mode="quick"
            label="Start Quick Cut"
            className="bg-gold-gradient text-black shadow-gold-glow hover:opacity-95 min-w-[220px]"
          />
        </motion.div>
      </div>
    </motion.article>
  )
}
