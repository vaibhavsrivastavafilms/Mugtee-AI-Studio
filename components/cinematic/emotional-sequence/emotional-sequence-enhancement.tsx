'use client'

import type { ReactNode } from 'react'
import type { CinematicScene } from '@/stores/cinematic-project'
import {
  EmotionalEscalationPresence,
  AtmosphereProgressionThread,
  EmotionalVisualRhythm,
  SceneSequenceFlow,
  EmotionalSequenceBridge,
  CinematicEscalationThread,
  SequenceAtmosphereProgression,
  EmotionalFlowContinuity,
  SequenceMemoryPresence,
} from '@/components/cinematic/emotional-sequence/emotional-sequence-core'
import { DirectorialPresenceEnhancement } from '@/components/cinematic/directorial-presence/directorial-presence-enhancement'
import { cn } from '@/lib/utils'

/**
 * Phase 3.2 + 3.3 — composes inside StoryWorldImmersionLayer around storyboard content.
 * Emotional sequence framing with directorial presence enhancement on storyboard body.
 */
export function EmotionalSequenceEnhancement({
  sceneIndex,
  totalScenes,
  style,
  niche,
  scene,
  children,
  className,
}: {
  sceneIndex: number
  totalScenes: number
  style?: string | null
  niche?: string | null
  scene?: CinematicScene | null
  children: ReactNode
  className?: string
}) {
  const seed = sceneIndex % 3

  return (
    <div className={cn('relative emotional-sequence-depth', className)}>
      <div
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-1.5 border-b border-white/[0.03] bg-black/[0.04]"
        role="status"
      >
        <EmotionalEscalationPresence
          sceneIndex={sceneIndex}
          totalScenes={totalScenes}
          style={style}
          niche={niche}
          seed={seed}
        />
        <SceneSequenceFlow
          sceneIndex={sceneIndex}
          totalScenes={totalScenes}
          seed={seed}
        />
        <AtmosphereProgressionThread
          sceneIndex={sceneIndex}
          totalScenes={totalScenes}
          seed={seed}
        />
        <EmotionalSequenceBridge
          sceneIndex={sceneIndex}
          totalScenes={totalScenes}
          seed={seed}
        />
      </div>

      <DirectorialPresenceEnhancement
        sceneIndex={sceneIndex}
        totalScenes={totalScenes}
        style={style}
        niche={niche}
        scene={scene}
      >
        {children}
      </DirectorialPresenceEnhancement>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 border-t border-white/[0.03] bg-black/[0.03]">
        <CinematicEscalationThread scene={scene} style={style} seed={seed} />
        <SequenceAtmosphereProgression sceneIndex={sceneIndex} style={style} niche={niche} />
        <EmotionalVisualRhythm style={style} niche={niche} seed={seed} />
        <EmotionalFlowContinuity seed={seed + 1} className="sm:ml-auto" />
        <SequenceMemoryPresence
          style={style}
          niche={niche}
          seed={seed}
          className="w-full sm:w-auto text-center sm:text-left"
        />
      </div>
    </div>
  )
}

export function EmotionalSequenceEnvironment({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative sequence-continuity-breathing', className)}>
      {children}
    </div>
  )
}
