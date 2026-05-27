'use client'

import { useMemo } from 'react'
import { buildRhythmMap } from '@/lib/creator/pacing-intelligence'
import type { CinematicScene } from '@/stores/cinematic-project'
import { cn } from '@/lib/utils'

export function CinematicRhythmMap({
  scenes,
  style,
  niche,
  activeIndex,
  className,
}: {
  scenes: Pick<CinematicScene, 'index' | 'emotion' | 'duration'>[]
  style?: string | null
  niche?: string | null
  activeIndex?: number
  className?: string
}) {
  const beats = useMemo(
    () => buildRhythmMap(scenes, style, niche),
    [scenes, style, niche]
  )

  if (beats.length === 0) return null

  return (
    <div
      className={cn(
        'flex items-stretch gap-1 overflow-x-auto scroll-touch no-scrollbar py-2 px-1',
        className
      )}
      role="list"
      aria-label="Cinematic rhythm map"
    >
      {beats.map((beat) => {
        const active = activeIndex === beat.index
        return (
          <div
            key={beat.index}
            role="listitem"
            className={cn(
              'flex flex-col items-center gap-1 min-w-[44px] shrink-0 calm-opacity-transition',
              active ? 'opacity-100' : 'opacity-45'
            )}
            aria-current={active ? 'step' : undefined}
          >
            <div className="flex items-end gap-0.5 h-3 w-full justify-center">
              {Array.from({ length: beat.intensity }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'w-0.5 rounded-full cinematic-rhythm-pulse',
                    active ? 'bg-[#D4AF37]/65' : 'bg-white/20'
                  )}
                  style={{ height: `${6 + i * 3}px` }}
                />
              ))}
            </div>
            <span className="text-[7px] tracking-[0.14em] uppercase text-white/35 text-center line-clamp-2 leading-tight">
              {beat.phase.split(' ')[0]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
