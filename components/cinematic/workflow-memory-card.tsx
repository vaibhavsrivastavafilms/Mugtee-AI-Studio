'use client'

import { useMemo } from 'react'
import { getWorkflowMemorySummary } from '@/lib/creator/creator-identity'
import { cn } from '@/lib/utils'

export function WorkflowMemoryCard({
  style,
  niche,
  className,
}: {
  style?: string | null
  niche?: string | null
  className?: string
}) {
  const memory = useMemo(
    () => getWorkflowMemorySummary(style, niche),
    [style, niche]
  )

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 sm:py-3.5 cinematic-identity-glow',
        className
      )}
    >
      <p className="text-[10px] tracking-[0.24em] uppercase text-[#C8A24E]/75">
        {memory.headline}
      </p>
      <p className="mt-1.5 text-[9px] tracking-[0.18em] uppercase text-white/30">
        {memory.detail}
      </p>
    </div>
  )
}
