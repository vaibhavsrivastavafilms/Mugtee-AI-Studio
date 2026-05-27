'use client'

import { useMemo } from 'react'
import { getHookTensionMarker } from '@/lib/creator/pacing-intelligence'
import { cn } from '@/lib/utils'

export function HookTensionMarker({
  hook,
  className,
}: {
  hook?: string | null
  className?: string
}) {
  const marker = useMemo(() => getHookTensionMarker(hook), [hook])

  return (
    <span
      className={cn(
        'inline-flex px-2 py-0.5 rounded-full border border-[#D4AF37]/12 bg-[#2B1A08]/25 text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/60',
        className
      )}
      role="status"
    >
      {marker}
    </span>
  )
}
