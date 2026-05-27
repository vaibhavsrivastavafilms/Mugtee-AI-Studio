'use client'

import { useEffect, useMemo, useState } from 'react'
import { getRefinementConfidenceLine } from '@/lib/creator/pacing-intelligence'
import { cn } from '@/lib/utils'

export function RefinementConfidenceStrip({
  visible,
  seed = 0,
  className,
}: {
  visible: boolean
  seed?: number
  className?: string
}) {
  const line = useMemo(() => getRefinementConfidenceLine(seed), [seed])
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (visible) {
      setShown(true)
      return
    }
    const timer = setTimeout(() => setShown(false), 280)
    return () => clearTimeout(timer)
  }, [visible])

  if (!shown && !visible) return null

  return (
    <p
      className={cn(
        'text-center text-[10px] tracking-[0.2em] uppercase text-[#C8A24E]/55 py-2 calm-opacity-transition continuity-preservation-fade',
        visible ? 'opacity-100' : 'opacity-0',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
