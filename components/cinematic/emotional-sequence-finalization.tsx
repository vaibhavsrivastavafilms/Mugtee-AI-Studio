'use client'

import { useMemo } from 'react'
import { getDeliveryAtmosphereLine } from '@/lib/creator/master-cinematic-copy'
import { getExportClosureLine } from '@/lib/creator/flow-state-copy'
import { cn } from '@/lib/utils'

export function EmotionalSequenceFinalization({
  seed = 0,
  className,
}: {
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}) {
  const deliveryLine = useMemo(() => getDeliveryAtmosphereLine(seed), [seed])
  const closureLine = useMemo(() => getExportClosureLine(seed + 1), [seed])

  return (
    <div className={cn('space-y-1', className)} role="status">
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/45 production-continuity-breathing">
        {deliveryLine}
      </p>
      <p className="text-[8px] tracking-[0.18em] uppercase text-white/28 hidden sm:block">
        {closureLine}
      </p>
    </div>
  )
}
