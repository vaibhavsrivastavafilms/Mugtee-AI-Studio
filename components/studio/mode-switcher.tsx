'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Clapperboard, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  creatorModeFromPathname,
  switchCreatorModeHref,
  type CreatorMode,
} from '@/lib/create/routes'
import { storeCreatorMode } from '@/lib/create/mode-selection'
import { resetQuickCutForFreshCreate } from '@/lib/cinematic/quick-cut/fresh-create'

type ModeSwitcherProps = {
  className?: string
  compact?: boolean
}

const MODES: { id: CreatorMode; label: string; shortLabel: string; icon: typeof Zap }[] = [
  { id: 'quick', label: 'Quick', shortLabel: 'Quick', icon: Zap },
  { id: 'director', label: 'Director', shortLabel: 'Director', icon: Clapperboard },
]

export function ModeSwitcher({ className, compact = false }: ModeSwitcherProps) {
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const activeMode = creatorModeFromPathname(pathname)
  const projectId = searchParams?.get('project') ?? null

  if (!activeMode) return null

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-white/[0.08] bg-black/40 p-0.5',
        className
      )}
      role="tablist"
      aria-label="Creator mode"
    >
      {MODES.map(({ id, label, shortLabel, icon: Icon }) => {
        const active = activeMode === id
        const href = switchCreatorModeHref(id, projectId)
        return (
          <Link
            key={id}
            href={href}
            role="tab"
            aria-selected={active}
            onClick={() => {
              storeCreatorMode(id)
              if (id === 'quick' && !projectId) resetQuickCutForFreshCreate()
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-all',
              active
                ? id === 'quick'
                  ? 'bg-[#8b5cf6] text-white shadow-[0_0_20px_-4px_rgba(139,92,246,0.55)]'
                  : 'bg-violet-500/20 text-violet-100 border border-violet-400/30 shadow-[0_0_16px_-6px_rgba(139,92,246,0.35)]'
                : 'text-muted-foreground hover:text-luxe hover:bg-white/[0.04]'
            )}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
            <span className={cn(compact ? 'sr-only sm:not-sr-only' : '')}>
              {compact ? shortLabel : label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
