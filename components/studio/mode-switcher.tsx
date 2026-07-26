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
  { id: 'quick', label: 'Fast idea', shortLabel: 'Idea', icon: Zap },
  { id: 'director', label: 'Creative world', shortLabel: 'World', icon: Clapperboard },
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
        'inline-flex items-center rounded-full border border-black/[0.08] bg-white/75 p-0.5 shadow-[0_10px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl',
        className
      )}
      aria-label="How Mugtee helps"
    >
      {MODES.map(({ id, label, shortLabel, icon: Icon }) => {
        const active = activeMode === id
        const href = switchCreatorModeHref(id, projectId)
        return (
          <Link
            key={id}
            href={href}
            aria-current={active ? 'page' : undefined}
            onClick={() => {
              storeCreatorMode(id)
              if (id === 'quick' && !projectId) resetQuickCutForFreshCreate()
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-all',
              active
                ? id === 'quick'
                  ? 'bg-[#FFD428] text-[#1D1D1D] shadow-[0_10px_22px_rgba(255,212,40,0.28)]'
                  : 'bg-[#14161D] text-[#F6F1E8] border border-[#D4AF37]/35 shadow-[0_10px_24px_rgba(9,10,15,0.22)]'
                : 'text-[#5E4B62] hover:text-[#1D1D1D] hover:bg-[#FFF8D8]'
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
