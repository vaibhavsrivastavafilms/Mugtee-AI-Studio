'use client'

import type { ReactNode } from 'react'
import { WorkflowAwarenessGlow } from '@/components/cinematic/workflow-awareness-glow'
import { IntelligentPresenceOverlay } from '@/components/cinematic/intelligent-presence-overlay'
import { EmotionalGuidanceFade } from '@/components/cinematic/emotional-guidance-fade'

export function CinematicIntelligenceLayer({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <WorkflowAwarenessGlow />
      <IntelligentPresenceOverlay />
      <EmotionalGuidanceFade>{children}</EmotionalGuidanceFade>
    </div>
  )
}
