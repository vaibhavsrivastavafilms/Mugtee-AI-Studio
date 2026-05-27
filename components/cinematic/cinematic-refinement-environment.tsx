'use client'

import { useEffect, useMemo, useState } from 'react'
import { getRefinementRhythmLine } from '@/lib/creator/master-cinematic-copy'
import { RefinementFlowPreserver } from '@/components/cinematic/refinement-flow-preserver'
import { EmotionalContinuityProtection } from '@/components/cinematic/emotional-continuity-protection'
import { SelectiveEvolutionEnvironment } from '@/components/cinematic/selective-evolution-environment'
import { DirectingRefinementShell } from '@/components/cinematic/directing-refinement-shell'
import { cn } from '@/lib/utils'

export function CinematicRefinementEnvironment({
  visible,
  seed = 0,
  className,
}: {
  visible: boolean
  seed?: number
  className?: string
}) {
  const rhythmLine = useMemo(() => getRefinementRhythmLine(seed), [seed])
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (visible) {
      setShown(true)
      return
    }
    const timer = setTimeout(() => setShown(false), 320)
    return () => clearTimeout(timer)
  }, [visible])

  if (!shown && !visible) return null

  return (
    <DirectingRefinementShell className={className}>
      <RefinementFlowPreserver visible={visible} seed={seed} />
      <EmotionalContinuityProtection visible={visible} line={rhythmLine} seed={seed} />
      <SelectiveEvolutionEnvironment visible={visible} seed={seed + 1} />
    </DirectingRefinementShell>
  )
}
