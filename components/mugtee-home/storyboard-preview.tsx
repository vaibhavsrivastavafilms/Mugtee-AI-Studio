'use client'

import { memo } from 'react'
import { Clapperboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GeneratedScene } from '@/lib/cinematic/generation'

export const StoryboardPreview = memo(function StoryboardPreview({
  scenes,
  loading = false,
}: {
  scenes: GeneratedScene[]
  loading?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-xl glass border border-gold-soft p-4 sm:p-5',
        loading && 'shimmer-cinematic'
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85 mb-3">
        <Clapperboard className="w-3 h-3" /> Scenes
      </div>
      <div className="space-y-2.5">
        {scenes.slice(0, 4).map((scene, i) => (
          <div
            key={scene.id}
            className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] tracking-[0.18em] uppercase text-gold-300/70">
                Scene {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-luxe/40">{scene.duration}s</span>
            </div>
            <p className="text-sm text-luxe/90 font-medium leading-snug">{scene.title}</p>
            <p className="text-[12px] text-luxe/55 leading-relaxed line-clamp-2 mt-0.5">
              {scene.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
})
