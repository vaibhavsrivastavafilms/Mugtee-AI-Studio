'use client'

import { cn } from '@/lib/utils'

type RhythmScene = {
  index: number
  active?: boolean
  intensity?: number
}

export function StoryboardRhythmStrip({
  scenes,
  className,
}: {
  scenes: RhythmScene[]
  className?: string
}) {
  if (scenes.length === 0) return null

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 overflow-x-auto scroll-touch no-scrollbar',
        className
      )}
      role="list"
      aria-label="Storyboard rhythm across scenes"
    >
      {scenes.map((scene) => (
        <RhythmTick key={scene.index} scene={scene} total={scenes.length} />
      ))}
    </div>
  )
}

function RhythmTick({ scene, total }: { scene: RhythmScene; total: number }) {
  const level = Math.min(5, Math.max(1, scene.intensity ?? 3))

  return (
    <div
      role="listitem"
      className={cn(
        'flex flex-col items-center gap-1 shrink-0 min-w-[36px] calm-opacity-transition',
        scene.active ? 'opacity-100' : 'opacity-50'
      )}
      aria-current={scene.active ? 'step' : undefined}
    >
      <div className="flex items-end gap-0.5 h-3">
        {Array.from({ length: level }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'w-0.5 rounded-full transition-all duration-300',
              scene.active ? 'bg-[#D4AF37]/70' : 'bg-white/20',
              i === level - 1 ? 'h-3' : i === level - 2 ? 'h-2' : 'h-1.5'
            )}
          />
        ))}
      </div>
      <span
        className={cn(
          'text-[7px] tracking-[0.18em] uppercase',
          scene.active ? 'text-[#C8A24E]/75' : 'text-white/30'
        )}
      >
        {scene.index}/{total}
      </span>
    </div>
  )
}
