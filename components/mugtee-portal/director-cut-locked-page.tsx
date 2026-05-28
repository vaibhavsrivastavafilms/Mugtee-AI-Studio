'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Lock } from 'lucide-react'
import { CinematicHeader } from '@/components/shell/cinematic-header'
import { CinematicBackground } from '@/components/mugtee-portal/cinematic-background'
import { LockedDirectorCutCard } from '@/components/mugtee-portal/locked-director-cut-card'
import { DIRECTOR_CUT_LOCKED_COPY } from '@/lib/features/director-cut-lock'
import {
  LockedDirectorCutTrigger,
  lockedDirectorCutTriggerClassName,
} from '@/components/mugtee-portal/locked-director-cut-trigger'

type DirectorCutLockedPageProps = {
  showBack?: boolean
  compact?: boolean
}

export function DirectorCutLockedPage({ showBack = true, compact = false }: DirectorCutLockedPageProps) {
  if (compact) {
    return (
      <div className="space-y-6 py-4">
        <div className="rounded-2xl border border-gold-500/20 bg-black/40 p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold-500/30 bg-gold-500/[0.08]">
            <Lock className="h-6 w-6 text-gold-300" />
          </div>
          <h2 className="font-display text-xl text-luxe">{DIRECTOR_CUT_LOCKED_COPY.modalTitle}</h2>
          <p className="text-sm text-luxe/50 max-w-md mx-auto">{DIRECTOR_CUT_LOCKED_COPY.modalBody}</p>
          <LockedDirectorCutTrigger className={lockedDirectorCutTriggerClassName()}>
            <Lock className="w-4 h-4" />
            {DIRECTOR_CUT_LOCKED_COPY.unlockCta}
          </LockedDirectorCutTrigger>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100dvh] flex flex-col bg-[#050505] text-luxe overflow-x-hidden film-grain">
      <CinematicBackground />
      <CinematicHeader variant="portal" />

      {showBack ? (
        <div className="relative z-20 px-5 pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-luxe/50 hover:text-gold-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to studio
          </Link>
        </div>
      ) : null}

      <motion.main
        className="relative z-10 flex-1 flex items-center justify-center px-5 py-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="w-full max-w-2xl">
          <LockedDirectorCutCard />
        </div>
      </motion.main>
    </div>
  )
}
