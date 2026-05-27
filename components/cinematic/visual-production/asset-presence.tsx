'use client'

import { useMemo } from 'react'
import { getAssetPresenceLine, getFrameLabel } from '@/lib/creator/visual-production-copy'
import type { CinematicScene } from '@/stores/cinematic-project'
import { CinematicVisualPulse } from '@/components/cinematic/cinematic-visual-pulse'
import { cn } from '@/lib/utils'

export function VisualAssetPresence({
  sceneIndex,
  seed = 0,
  className,
}: {
  sceneIndex: number
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getAssetPresenceLine(sceneIndex, seed),
    [sceneIndex, seed]
  )

  return (
    <p
      className={cn(
        'inline-flex items-center gap-1.5 text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/48',
        className
      )}
      role="status"
    >
      <CinematicVisualPulse />
      {line}
    </p>
  )
}

export function CinematicFrameLabel({
  scene,
  className,
}: {
  scene: CinematicScene
  className?: string
}) {
  const label = useMemo(() => getFrameLabel(scene), [scene])

  return (
    <span
      className={cn(
        'inline-block px-2 py-0.5 rounded-full bg-black/50 border border-white/[0.08] text-[8px] tracking-[0.18em] uppercase text-[#F4E7C1]/75 production-frame-focus',
        className
      )}
    >
      {label}
    </span>
  )
}

export function ProductionAssetEnvironment({
  children,
  sceneIndex,
  className,
}: {
  children: React.ReactNode
  sceneIndex: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative rounded-xl border border-white/[0.05] bg-black/20 cinematic-visual-depth',
        className
      )}
    >
      <div className="px-3 pt-2 pb-1">
        <VisualAssetPresence sceneIndex={sceneIndex} seed={sceneIndex % 3} />
      </div>
      {children}
    </div>
  )
}

export function CinematicReferenceStrip({
  scenes,
  activeIndex,
  className,
}: {
  scenes: Array<{ index: number; title?: string }>
  activeIndex?: number
  className?: string
}) {
  if (scenes.length === 0) return null

  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto no-scrollbar scroll-touch px-1 py-2',
        className
      )}
      role="list"
      aria-label="Visual sequence reference"
    >
      {scenes.map((scene) => {
        const active = activeIndex === scene.index
        return (
          <div
            key={scene.index}
            role="listitem"
            className={cn(
              'shrink-0 min-w-[72px] px-2 py-1.5 rounded-lg border text-center storyboard-presence-fade',
              active
                ? 'border-[#D4AF37]/30 bg-[#D4AF37]/10 production-frame-focus'
                : 'border-white/[0.06] bg-black/30 opacity-70'
            )}
          >
            <p className="text-[8px] tracking-[0.16em] uppercase text-[#C8A24E]/60">
              Beat {scene.index}
            </p>
          </div>
        )
      })}
    </div>
  )
}
