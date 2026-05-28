'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { CinematicBackground } from '@/components/mugtee-portal/cinematic-background'
import { CinematicHeader } from '@/components/shell/cinematic-header'
import { QuickCutCard } from '@/components/mugtee-portal/quick-cut-card'
import { DirectorCutCard } from '@/components/mugtee-portal/director-cut-card'
import { LockedDirectorCutCard } from '@/components/mugtee-portal/locked-director-cut-card'
import { isDirectorCutLocked } from '@/lib/features/director-cut-lock'

const AmbientParticles = dynamic(
  () =>
    import('@/components/mugtee-portal/ambient-particles').then((m) => ({
      default: m.AmbientParticles,
    })),
  { ssr: false }
)

export function ModeSelectionHero() {
  return (
    <div className="relative min-h-[100dvh] flex flex-col bg-[#050505] text-luxe overflow-x-hidden film-grain">
      <CinematicBackground />
      <Suspense fallback={null}>
        <AmbientParticles />
      </Suspense>

      <CinematicHeader variant="portal" />

      <header className="relative z-20 flex flex-col items-center px-5 pt-6 sm:pt-10 pb-4 sm:pb-6 text-center">
        <motion.div
          className="max-w-xl space-y-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-4 w-[min(480px,90vw)] h-24 bg-gold-500/[0.08] blur-[80px] rounded-full"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          />
          <h1 className="relative font-display text-3xl sm:text-4xl lg:text-[2.75rem] leading-[1.1] text-luxe">
            Your Cinematic AI Studio
          </h1>
          <p className="relative text-base sm:text-lg text-luxe/55">
            Choose how you want to create.
          </p>
        </motion.div>
      </header>

      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0">
        <QuickCutCard />
        {isDirectorCutLocked ? <LockedDirectorCutCard /> : <DirectorCutCard />}
      </main>
    </div>
  )
}
