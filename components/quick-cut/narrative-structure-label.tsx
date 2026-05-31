'use client'

import { cn } from '@/lib/utils'

export function NarrativeStructureLabel({
  archetypeLabel,
  narrativeFlowDisplay,
  className,
}: {
  archetypeLabel?: string | null
  narrativeFlowDisplay?: string | null
  className?: string
}) {
  const archetype = archetypeLabel?.trim()
  const flow = narrativeFlowDisplay?.trim()
  if (!archetype && !flow) return null

  return (
    <div className={cn('space-y-0.5', className)}>
      {archetype ? (
        <p className="text-[10px] tracking-[0.18em] uppercase text-luxe/50">
          Archetype:{' '}
          <span className="text-gold-300/75">{archetype}</span>
        </p>
      ) : null}
      {flow ? (
        <p className="text-[10px] tracking-[0.18em] uppercase text-luxe/50">
          Narrative:{' '}
          <span className="text-gold-300/75 normal-case tracking-normal">{flow}</span>
        </p>
      ) : null}
    </div>
  )
}
