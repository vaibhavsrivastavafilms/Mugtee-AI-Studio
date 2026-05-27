'use client'

import { useMemo } from 'react'
import { getRefinementRhythmLine } from '@/lib/creator/master-cinematic-copy'
import { EmotionalRhythmProtection } from '@/components/cinematic/emotional-rhythm-protection'
import { ContinuityPreservationNote } from '@/components/cinematic/continuity-preservation-note'
import { cn } from '@/lib/utils'

export function EmotionalContinuityProtection({
  visible,
  line,
  seed = 0,
  className,
}: {
  visible: boolean
  line?: string
  seed?: number
  className?: string
}) {
  const rhythmLine = useMemo(
    () => line ?? getRefinementRhythmLine(seed),
    [line, seed]
  )

  if (!visible) return null

  return (
    <div className={cn('space-y-1', className)} role="status">
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/50 emotional-sequence-opacity">
        {rhythmLine}
      </p>
      <EmotionalRhythmProtection visible={visible} seed={seed} />
      <ContinuityPreservationNote seed={seed + 1} />
    </div>
  )
}
