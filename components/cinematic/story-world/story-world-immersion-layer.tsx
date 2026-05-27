'use client'

import type { ReactNode } from 'react'
import type { CinematicScene } from '@/stores/cinematic-project'
import { CinematicStoryworldShell } from '@/components/cinematic/story-world/story-world-environment'
import { EnvironmentDirectionStrip } from '@/components/cinematic/story-world/environment-direction'
import {
  ImmersiveFrameComposition,
  CinematicShotPresence,
  VisualStoryDepth,
} from '@/components/cinematic/story-world/frame-immersion'
import { VisualStoryMemoryStrip } from '@/components/cinematic/story-world/visual-memory'
import { VisualWorldPresenceFade } from '@/components/cinematic/story-world/micro-motion'
import { EmotionalSequenceEnhancement } from '@/components/cinematic/emotional-sequence/emotional-sequence-enhancement'
import { cn } from '@/lib/utils'

/**
 * Phase 3.1 + 3.2 — composes inside CinematicSceneProduction.
 * Story-world atmosphere with emotional sequence enhancement around storyboard content.
 */
export function StoryWorldImmersionLayer({
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
    <VisualWorldPresenceFade className={cn('relative', className)}>
      <CinematicStoryworldShell
        sceneIndex={sceneIndex}
        totalScenes={totalScenes}
        seed={seed}
      >
        <EnvironmentDirectionStrip
          scene={scene}
          style={style}
          niche={niche}
          seed={seed}
        />

        <ImmersiveFrameComposition sceneIndex={sceneIndex} seed={seed}>
          <EmotionalSequenceEnhancement
            sceneIndex={sceneIndex}
            totalScenes={totalScenes}
            style={style}
            niche={niche}
            scene={scene}
          >
            {children}
          </EmotionalSequenceEnhancement>
        </ImmersiveFrameComposition>

        <div className="hidden sm:flex items-center justify-between gap-2 px-3 py-1 border-t border-white/[0.03]">
          <CinematicShotPresence sceneIndex={sceneIndex} seed={seed} />
          <VisualStoryDepth seed={seed + 1} />
        </div>

        <VisualStoryMemoryStrip scene={scene} style={style} niche={niche} seed={seed} />
      </CinematicStoryworldShell>
    </VisualWorldPresenceFade>
  )
}
