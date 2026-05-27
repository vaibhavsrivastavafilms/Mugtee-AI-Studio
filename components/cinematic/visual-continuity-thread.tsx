'use client'

import { useMemo } from 'react'
import { getVisualContinuityThread } from '@/lib/creator/pacing-intelligence'
import { cn } from '@/lib/utils'

export function VisualContinuityThread({
  style,
  niche,
  seed = 0,
  className,
}: {
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getVisualContinuityThread(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.04] bg-black/20',
        className
      )}
      role="status"
    >
      <span className="h-px flex-1 cinematic-soft-divider opacity-60" />
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/32 shrink-0">
        {line}
      </p>
      <span className="h-px flex-1 cinematic-soft-divider opacity-60" />
    </div>
  )
}
