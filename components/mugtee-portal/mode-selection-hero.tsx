'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { Clapperboard } from 'lucide-react'
import Link from 'next/link'
import { CinematicBackground } from '@/components/mugtee-portal/cinematic-background'
import { CinematicHeader } from '@/components/shell/cinematic-header'
import { QuickCutCard } from '@/components/mugtee-portal/quick-cut-card'
import { RecentProjectsRail } from '@/components/mugtee-portal/recent-projects-rail'
import { isDirectorCutLocked } from '@/lib/features/director-cut-lock'
import { authLoginHref } from '@/lib/create/mode-selection'

const AmbientParticles = dynamic(
  () =>
    import('@/components/mugtee-portal/ambient-particles').then((m) => ({
      default: m.AmbientParticles,
    })),
  { ssr: false }
)

export function ModeSelectionHero() {
  const directorHref = isDirectorCutLocked
    ? authLoginHref('director', { locked: '1' })
    : authLoginHref('director')

  return (
    <div className="relative min-h-[100dvh] flex flex-col bg-[#050505] text-luxe overflow-x-hidden film-grain">
      <CinematicBackground />
      <Suspense fallback={null}>
        <AmbientParticles />
      </Suspense>

      <CinematicHeader variant="portal" />

      <main className="relative z-10 flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
          <QuickCutCard />
        </div>

        <motion.aside
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative z-10 border-t border-white/[0.04] bg-black/20"
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-luxe/40">
              <Clapperboard className="w-4 h-4 shrink-0" />
              <p className="text-xs sm:text-sm text-center sm:text-left">
                Need scene-by-scene control?{' '}
                <span className="text-luxe/55">Director Mode</span> is available for full cinematic workspace editing.
              </p>
            </div>
            <Link
              href={directorHref}
              className="shrink-0 text-[10px] tracking-[0.22em] uppercase text-gold-300/70 hover:text-gold-200 border border-white/[0.08] hover:border-gold-500/25 rounded-lg px-4 py-2 transition-colors"
            >
              {isDirectorCutLocked ? 'Preview Director Mode' : 'Enter Director Mode'}
            </Link>
          </div>
        </motion.aside>

        <RecentProjectsRail />
      </main>
    </div>
  )
}
