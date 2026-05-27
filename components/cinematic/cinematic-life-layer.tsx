'use client'

import { WorkflowAwarenessGlow } from '@/components/cinematic/workflow-awareness-glow'
import { CinematicEnvironmentPulse } from '@/components/cinematic/cinematic-environment-pulse'
import { cn } from '@/lib/utils'

export function CinematicLifeLayer({ className }: { className?: string }) {
  return (
    <>
      <WorkflowAwarenessGlow />
      <div
        className={cn(
          'pointer-events-none absolute top-4 right-4 sm:top-6 sm:right-6',
          className
        )}
        aria-hidden
      >
        <CinematicEnvironmentPulse />
      </div>
    </>
  )
}
