'use client'

import { useMemo } from 'react'
import { getCinematicProcessPresence } from '@/lib/creator/operating-presence-copy'
import { cn } from '@/lib/utils'

export function ActiveProductionLayer({
  style,
  niche,
  status = 'create',
  className,
}: {
  style?: string | null
  niche?: string | null
  status?: string
  className?: string
}) {
  const line = useMemo(
    () => getCinematicProcessPresence(status, (style?.length ?? 0) % 3),
    [status, style]
  )

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 h-16 sm:h-20 bg-gradient-to-t from-black/50 to-transparent flex items-end justify-center pb-2 sm:pb-3',
        className
      )}
      aria-hidden
    >
      <p className="text-[8px] sm:text-[9px] tracking-[0.22em] uppercase text-[#C8A24E]/35 production-continuity-breathing max-w-[90vw] truncate px-4">
        {line}
      </p>
    </div>
  )
}
