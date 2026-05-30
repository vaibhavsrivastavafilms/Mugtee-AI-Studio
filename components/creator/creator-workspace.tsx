'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Clapperboard, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createEntryHref } from '@/lib/create/routes'
import { isDirectorCutLocked } from '@/lib/features/director-cut-lock'
import { LockedDirectorCutModeCard } from '@/components/mugtee-portal/locked-director-cut-mode-card'
import { DailyPromptCard } from '@/components/creator/daily-prompt-card'
import { ContinueCreatingWidget } from '@/components/creator/continue-creating-widget'
import { CreatorQueue } from '@/components/creator/creator-queue'
import { CreatorStreakBadge } from '@/components/creator/creator-streak-badge'
import { PipelineFeatures } from '@/components/landing/pipeline-features'
import { useCreatorStreakTracker } from '@/hooks/use-creator-streak'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'

function QuickModeLink() {
  return (
    <Link
      href={createEntryHref('quick')}
      className={cn(
        'group flex items-center gap-3 rounded-xl border border-gold-500/25',
        'bg-gold-500/[0.06] p-4 hover:border-gold-500/40 transition-colors'
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-gradient text-black">
        <Zap className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-luxe">Quick Cut</p>
        <p className="text-xs text-luxe/50 truncate">One-click cinematic generation</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gold-300/60 group-hover:text-gold-200 transition-colors" />
    </Link>
  )
}

function DirectorModeLink() {
  if (isDirectorCutLocked) {
    return (
      <div className="rounded-xl border border-white/[0.06] p-4 opacity-80">
        <LockedDirectorCutModeCard description="Scene-by-scene cinematic control" className="p-4" />
      </div>
    )
  }

  return (
    <Link
      href={createEntryHref('director')}
      className={cn(
        'group flex items-center gap-3 rounded-xl border border-white/[0.06]',
        'bg-white/[0.02] p-4 hover:border-gold-500/25 transition-colors'
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-gold-300">
        <Clapperboard className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-luxe">Director Cut</p>
        <p className="text-xs text-luxe/50 truncate">Full pipeline control</p>
      </div>
      <ArrowRight className="w-4 h-4 text-luxe/40 group-hover:text-gold-200 transition-colors" />
    </Link>
  )
}

export function CreatorWorkspace() {
  const { user } = useAuthHydration()
  useCreatorStreakTracker(user?.id)

  return (
    <div className="max-w-[1200px] mx-auto w-full space-y-8 sm:space-y-10">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 px-0.5"
      >
        <div>
          <p className="text-[10px] tracking-[0.32em] uppercase text-gold-300/70 mb-1">
            Creator Workspace
          </p>
          <h1 className="font-display text-2xl sm:text-3xl text-luxe">Your studio awaits</h1>
        </div>
        {user?.id ? <CreatorStreakBadge userId={user.id} /> : null}
      </motion.header>

      <DailyPromptCard />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <QuickModeLink />
        <DirectorModeLink />
      </div>

      <ContinueCreatingWidget limit={8} />

      <PipelineFeatures className="pt-2" />

      <CreatorQueue />
    </div>
  )
}
