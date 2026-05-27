'use client'

import { useMemo } from 'react'
import { getContinuityMemoryLine } from '@/lib/creator/creator-identity'
import { cn } from '@/lib/utils'

export function CreatorMemoryStrip({
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
    () => getContinuityMemoryLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <div
      className={cn(
        'mb-4 rounded-xl border border-white/[0.04] bg-black/20 px-4 py-2.5 text-center creator-memory-highlight',
        className
      )}
      role="status"
    >
      <p className="text-[10px] tracking-[0.2em] uppercase text-[#C8A24E]/60">
        {line}
      </p>
    </div>
  )
}
