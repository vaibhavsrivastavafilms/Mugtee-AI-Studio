'use client'

import type { ReactNode } from 'react'
import { StoryboardRhythmStrip } from '@/components/cinematic/storyboard-rhythm-strip'
import { AtmosphericSceneShell } from '@/components/cinematic/atmospheric-scene-shell'
import { SceneEmotionalBridge } from '@/components/cinematic/scene-emotional-bridge'
import type { CinematicScene } from '@/stores/cinematic-project'
import { cn } from '@/lib/utils'

export function ImmersiveStoryboardComposer({
  scenes,
  style,
  niche,
  activeIndex,
  sceneIndex,
  active = false,
  intensity = 3,
  children,
  className,
}: {
  scenes: CinematicScene[]
  style?: string | null
  niche?: string | null
  activeIndex?: number
  sceneIndex?: number
  active?: boolean
  intensity?: number
  children: ReactNode
  className?: string
}) {
  const rhythmScenes = scenes.map((scene, i) => ({
    index: scene.index,
    active: activeIndex != null ? scene.index === activeIndex : i === 0,
    intensity: Math.min(5, 2 + (i % 3)),
  }))

  return (
    <div className={cn('space-y-3 screenplay-rhythm-spacing', className)}>
      {scenes.length > 0 ? (
        <StoryboardRhythmStrip
          className="rounded-xl border border-white/[0.04] bg-black/20 visual-composition-weight hidden sm:block"
          scenes={rhythmScenes}
        />
      ) : null}
      <AtmosphericSceneShell active={active} intensity={intensity}>
        {children}
      </AtmosphericSceneShell>
      {sceneIndex != null && scenes.length > 1 ? (
        <SceneEmotionalBridge
          sceneIndex={sceneIndex}
          totalScenes={scenes.length}
          style={style}
          niche={niche}
          className="hidden sm:block"
        />
      ) : null}
    </div>
  )
}
