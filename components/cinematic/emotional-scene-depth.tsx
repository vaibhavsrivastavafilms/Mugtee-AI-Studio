'use client'

import { VisualIntensityGlow } from '@/components/cinematic/visual-intensity-glow'
import { cn } from '@/lib/utils'

export function EmotionalSceneDepth({
  active = false,
  intensity = 3,
  className,
}: {
  active?: boolean
  intensity?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 calm-opacity-transition',
        active ? 'opacity-100' : 'opacity-40',
        className
      )}
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />
      {active ? <VisualIntensityGlow level={intensity} className="absolute inset-0" /> : null}
    </div>
  )
}
