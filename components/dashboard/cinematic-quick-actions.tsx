'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clapperboard, FolderKanban, ImageIcon, Lock, Plus, Sparkles, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isDirectorCutLocked } from '@/lib/features/director-cut-lock'
import {
  LockedDirectorCutTrigger,
} from '@/components/mugtee-portal/locked-director-cut-trigger'
import { DIRECTOR_CUT_LOCKED_COPY } from '@/lib/features/director-cut-lock'

const ACTIONS = [
  {
    href: '/create?mode=quick',
    label: 'New Project',
    description: 'Start a cinematic faceless video from one idea.',
    icon: Plus,
    primary: true,
  },
  {
    href: '/create?tab=projects',
    label: 'All Projects',
    description: 'Browse your production pipeline and drafts.',
    icon: FolderKanban,
    primary: false,
  },
  {
    href: '/create?tab=projects&filter=downloaded',
    label: 'Downloaded Reels',
    description: 'Finished MP4s ready to share or post.',
    icon: ImageIcon,
    primary: false,
  },
  {
    href: '/create?mode=director',
    label: 'Director Cut',
    description: 'Full cinematic workflow with scene-by-scene control.',
    icon: Clapperboard,
    primary: false,
  },
] as const

export function CinematicQuickActions() {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-gold-300" />
        <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold-300">
          Quick Actions
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ACTIONS.map((action, i) => {
          const Icon = action.icon
          const isDirectorAction = action.href === '/create?mode=director'

          if (isDirectorAction && isDirectorCutLocked) {
            return (
              <motion.div
                key={action.href}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
              >
                <LockedDirectorCutTrigger
                  className={cn(
                    'group flex flex-col h-full rounded-2xl border p-5 transition-all duration-300 text-left w-full',
                    'border-gold-500/20 bg-gradient-to-br from-black/60 via-[#0a0a0a] to-black/80',
                    'hover:border-gold-500/40 hover:shadow-[0_0_40px_rgba(212,175,55,0.1)]'
                  )}
                >
                  <div className="relative mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/30 bg-black/50 text-gold-300">
                    <Icon className="w-4 h-4" />
                    <Lock className="absolute -bottom-1 -right-1 w-3 h-3 text-gold-400 bg-black rounded-full p-0.5" />
                  </div>
                  <div className="font-display text-base text-luxe/85 group-hover:text-gold-100 transition-colors">
                    {action.label}
                  </div>
                  <p className="mt-1.5 text-xs text-luxe/50 leading-relaxed flex-1">{action.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-gold-300/80">
                    <Lock className="w-3 h-3" />
                    {DIRECTOR_CUT_LOCKED_COPY.premiumLabel}
                  </span>
                </LockedDirectorCutTrigger>
              </motion.div>
            )
          }

          return (
            <motion.div
              key={action.href}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
            >
              <Link
                href={action.href}
                className={cn(
                  'group flex flex-col h-full rounded-2xl border p-5 transition-all duration-300',
                  action.primary
                    ? 'border-gold-500/35 bg-gold-500/[0.08] hover:border-gold-500/50 hover:bg-gold-500/[0.12] shadow-gold-glow'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-gold-500/25 hover:bg-white/[0.04]'
                )}
              >
                <div
                  className={cn(
                    'mb-4 flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                    action.primary
                      ? 'bg-gold-gradient text-black shadow-gold-glow'
                      : 'border border-white/[0.08] bg-white/[0.03] text-gold-300 group-hover:border-gold-500/30'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="font-display text-base text-luxe group-hover:text-gold-100 transition-colors">
                  {action.label}
                </div>
                <p className="mt-1.5 text-xs text-luxe/50 leading-relaxed flex-1">
                  {action.description}
                </p>
                {action.primary ? (
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-gold-300">
                    <Sparkles className="w-3 h-3" /> Start creating
                  </span>
                ) : null}
              </Link>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
