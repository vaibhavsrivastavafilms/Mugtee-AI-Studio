'use client'

import { useMemo } from 'react'
import { getSelectiveEvolutionLine } from '@/lib/creator/master-cinematic-copy'
import { SelectiveRefineGuidance } from '@/components/cinematic/selective-refine-guidance'
import { EmotionalRefinePresence } from '@/components/cinematic/emotional-refine-presence'
import { cn } from '@/lib/utils'

export function SelectiveEvolutionEnvironment({
  visible,
  seed = 0,
  className,
}: {
  visible: boolean
  seed?: number
  className?: string
}) {
  const line = useMemo(() => getSelectiveEvolutionLine(seed), [seed])

  if (!visible) return null

  return (
    <div className={cn('space-y-1', className)} role="status">
      <p className="text-[8px] tracking-[0.18em] uppercase text-white/28 hidden sm:block">
        {line}
      </p>
      <SelectiveRefineGuidance visible={visible} seed={seed} />
      <EmotionalRefinePresence visible={visible} seed={seed} />
    </div>
  )
}
