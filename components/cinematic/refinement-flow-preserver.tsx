'use client'

import { useEffect, useMemo, useState } from 'react'
import { getRefinementFlowLine } from '@/lib/creator/flow-state-copy'
import { RefinementConfidenceStrip } from '@/components/cinematic/refinement-confidence-strip'
import { EmotionalRhythmProtection } from '@/components/cinematic/emotional-rhythm-protection'
import { CinematicRefineFocus } from '@/components/cinematic/cinematic-refine-focus'
import { cn } from '@/lib/utils'

export function RefinementFlowPreserver({
  visible,
  seed = 0,
  className,
}: {
  visible: boolean
  seed?: number
  className?: string
}) {
  const line = useMemo(() => getRefinementFlowLine(seed), [seed])
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (visible) {
      setShown(true)
      return
    }
    const timer = setTimeout(() => setShown(false), 300)
    return () => clearTimeout(timer)
  }, [visible])

  if (!shown && !visible) return null

  return (
    <div
      className={cn('space-y-1 continuity-preservation-fade', className)}
      role="status"
    >
      <RefinementConfidenceStrip visible={visible} seed={seed} />
      <CinematicRefineFocus visible={visible} line={line} />
      <EmotionalRhythmProtection visible={visible} seed={seed + 1} />
    </div>
  )
}
