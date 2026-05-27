'use client'

import { useMemo } from 'react'
import { getPacingFlowStripLine } from '@/lib/creator/flow-state-copy'
import { cn } from '@/lib/utils'

export function PacingFlowStrip({
  seed = 0,
  className,
}: {
  seed?: number
  className?: string
}) {
  const line = useMemo(() => getPacingFlowStripLine(seed), [seed])

  return (
    <div
      className={cn(
        'mb-4 rounded-lg border border-white/[0.03] bg-black/15 px-3 py-2 text-center',
        className
      )}
      role="status"
    >
      <p className="text-[9px] tracking-[0.2em] uppercase text-[#C8A24E]/48 emotional-rhythm-breathing">
        {line}
      </p>
    </div>
  )
}
