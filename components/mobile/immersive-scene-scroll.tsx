'use client'

import { useMemo, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  buildEmotionalScrollRhythm,
  scrollSnapClass,
} from '@/lib/mobile/emotional-scroll-rhythm'
import { optimizeAtmosphereRender } from '@/lib/cinematic/execution/cinematic-performance-engine'

export function ImmersiveSceneScroll({
  scenes,
  durationSec = 30,
  className,
  renderScene,
}: {
  scenes: Array<{ id: string; title?: string }>
  durationSec?: number
  className?: string
  renderScene: (scene: { id: string; title?: string }, index: number, label: string) => ReactNode
}) {
  const { preferReducedLayers } = optimizeAtmosphereRender()
  const rhythm = useMemo(
    () => buildEmotionalScrollRhythm(scenes.length || 1, durationSec, preferReducedLayers),
    [scenes.length, durationSec, preferReducedLayers]
  )

  const longForm = scenes.length >= 10

  return (
    <div
      className={cn(
        'immersive-scene-scroll max-h-[min(72dvh,640px)] overflow-y-auto overscroll-y-contain',
        longForm && 'max-h-[min(76dvh,680px)]',
        'px-[max(0.5rem,env(safe-area-inset-left))]',
        'pb-[max(1.25rem,env(safe-area-inset-bottom))]',
        scrollSnapClass(preferReducedLayers),
        preferReducedLayers && 'cinematic-reduced-layers',
        className
      )}
    >
      {scenes.map((scene, i) => (
        <section
          key={scene.id}
          className={cn(
            'min-h-[min(52dvh,420px)] px-4 py-7 flex flex-col justify-center',
            !preferReducedLayers && 'snap-start snap-always',
            preferReducedLayers && 'py-8',
          )}
          style={{ scrollMarginTop: '1rem' }}
        >
          <p className="text-[9px] tracking-[0.22em] uppercase text-[#C8A24E]/60 mb-3">
            {rhythm[i]?.label ?? `Beat ${i + 1}`}
          </p>
          {renderScene(scene, i, rhythm[i]?.label ?? `Beat ${i + 1}`)}
        </section>
      ))}
    </div>
  )
}
