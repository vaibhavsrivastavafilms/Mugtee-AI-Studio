'use client'

import type { ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useCinematicProjectStore } from '@/stores/cinematic-project'
import { CinematicEnvironmentDepth } from '@/components/cinematic/cinematic-environment-depth'
import { ImmersiveWorkspaceAtmosphere } from '@/components/cinematic/immersive-workspace-atmosphere'
import { DirectingSpatialLayer } from '@/components/cinematic/directing-spatial-layer'
import { VisualCompositionOverlay } from '@/components/cinematic/visual-composition-overlay'
import { ActiveProductionLayer } from '@/components/cinematic/active-production-layer'
import { DirectingEnvironmentFrame } from '@/components/cinematic/directing-environment-frame'
import { AtmosphereBreathingLayer } from '@/components/cinematic/atmosphere-breathing-layer'

export function CinematicOperatingShell({ children }: { children: ReactNode }) {
  const { style, niche, status } = useCinematicProjectStore(
    useShallow((s) => ({
      style: s.style,
      niche: s.niche,
      status: s.status,
    }))
  )

  return (
    <div className="relative min-h-screen">
      <CinematicEnvironmentDepth />
      <ImmersiveWorkspaceAtmosphere />
      <DirectingSpatialLayer />
      <VisualCompositionOverlay />
      <AtmosphereBreathingLayer />
      <ActiveProductionLayer style={style} niche={niche} status={status} />
      <DirectingEnvironmentFrame>{children}</DirectingEnvironmentFrame>
    </div>
  )
}
