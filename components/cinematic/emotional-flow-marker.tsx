'use client'

import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { getEmotionalFlowMarker } from '@/lib/creator/flow-state-copy'
import { cn } from '@/lib/utils'

export function EmotionalFlowMarker({
  seed = 0,
  className,
}: {
  seed?: number
  className?: string
}) {
  const pathname = usePathname()
  const stage = pathname?.split('/').pop() || 'create'
  const marker = useMemo(
    () => getEmotionalFlowMarker(stage, seed),
    [stage, seed]
  )

  return (
    <span
      className={cn(
        'inline-flex px-2.5 py-1 rounded-full border border-white/[0.06] text-[8px] tracking-[0.2em] uppercase text-white/35',
        className
      )}
      role="status"
    >
      {marker}
    </span>
  )
}
