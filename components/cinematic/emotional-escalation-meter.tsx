'use client'

import { useMemo } from 'react'
import { getEscalationLabel } from '@/lib/creator/pacing-intelligence'
import { cn } from '@/lib/utils'

export function EmotionalEscalationMeter({
  sceneIndex,
  totalScenes,
  style,
  niche,
  className,
}: {
  sceneIndex: number
  totalScenes: number
  style?: string | null
  niche?: string | null
  className?: string
}) {
  const label = useMemo(
    () => getEscalationLabel(sceneIndex, totalScenes, style, niche),
    [sceneIndex, totalScenes, style, niche]
  )
  const level = Math.min(5, Math.max(1, Math.ceil((sceneIndex / Math.max(totalScenes, 1)) * 5)))

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="img"
      aria-label={`Emotional escalation: ${label}`}
    >
      <span className="text-[8px] tracking-[0.2em] uppercase text-white/30 shrink-0 hidden sm:inline">
        Escalation
      </span>
      <div className="flex items-end gap-0.5 h-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'w-0.5 rounded-full transition-opacity duration-300',
              i < level ? 'bg-[#D4AF37]/60 emotional-escalation-glow' : 'bg-white/10',
              i === level - 1 ? 'h-2.5' : 'h-1.5'
            )}
          />
        ))}
      </div>
      <span className="text-[8px] tracking-[0.16em] uppercase text-[#C8A24E]/55 truncate max-w-[140px] sm:max-w-none">
        {label}
      </span>
    </div>
  )
}
