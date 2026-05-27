'use client'

import type { CinematicScene } from '@/stores/cinematic-project'
import { visualChipLabels } from '@/lib/cinematic/visual-direction'

export function SceneVisualChips({ scene }: { scene: CinematicScene }) {
  const chips = visualChipLabels(scene)
  const items = [
    chips.camera,
    chips.palette,
    chips.movement,
  ].filter(Boolean)

  if (!items.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((label) => (
        <span
          key={label}
          className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-[#E7C56A]/80"
        >
          {label}
        </span>
      ))}
    </div>
  )
}
