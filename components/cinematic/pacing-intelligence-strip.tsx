'use client'

import { useMemo } from 'react'
import { getPacingIntelligenceLine } from '@/lib/creator/pacing-intelligence'
import { cn } from '@/lib/utils'

export function PacingIntelligenceStrip({
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
    () => getPacingIntelligenceLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <div
      className={cn(
        'mb-4 rounded-xl border border-white/[0.04] bg-black/25 px-4 py-2.5 text-center pacing-awareness-glow',
        className
      )}
      role="status"
    >
      <p className="text-[10px] tracking-[0.2em] uppercase text-[#C8A24E]/62 intelligent-guidance-opacity">
        {line}
      </p>
    </div>
  )
}
