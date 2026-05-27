'use client'

import type { ReactNode } from 'react'
import { CinematicIntelligenceLayer } from '@/components/cinematic/cinematic-intelligence-layer'
import { CinematicFlowShell } from '@/components/cinematic/cinematic-flow-shell'
import { WorkflowFocusPreserver } from '@/components/cinematic/workflow-focus-preserver'
import { CinematicMotionOrchestrator } from '@/components/cinematic/cinematic-motion-orchestrator'
import { CinematicFocusComposer } from '@/components/cinematic/cinematic-focus-composer'
import { DirectingAttentionEnvironment } from '@/components/cinematic/directing-attention-environment'
import { EmotionalNoiseReduction } from '@/components/cinematic/emotional-noise-reduction'

export function MasterCinematicEnvironment({ children }: { children: ReactNode }) {
  return (
    <CinematicMotionOrchestrator>
      <CinematicFocusComposer>
        <CinematicIntelligenceLayer>
          <CinematicFlowShell>
            <WorkflowFocusPreserver />
            <DirectingAttentionEnvironment>
              <EmotionalNoiseReduction>{children}</EmotionalNoiseReduction>
            </DirectingAttentionEnvironment>
          </CinematicFlowShell>
        </CinematicIntelligenceLayer>
      </CinematicFocusComposer>
    </CinematicMotionOrchestrator>
  )
}
