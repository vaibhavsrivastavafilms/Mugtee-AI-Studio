'use client'

import type { ReactNode } from 'react'
import { FlowStateOverlay } from '@/components/cinematic/flow-state-overlay'
import { CreativeFocusLayer } from '@/components/cinematic/creative-focus-layer'
import { ImmersiveSessionFrame } from '@/components/cinematic/immersive-session-frame'

export function CinematicFlowShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative cinematic-attention-weight">
      <FlowStateOverlay />
      <CreativeFocusLayer />
      <ImmersiveSessionFrame>{children}</ImmersiveSessionFrame>
    </div>
  )
}
