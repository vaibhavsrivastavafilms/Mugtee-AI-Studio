'use client'

import Image from 'next/image'
import { ImageIcon, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TimelineSceneClip } from '@/types/timeline'

type AssetsPanelProps = {
  scenes: TimelineSceneClip[]
  selectedSceneId: string | null
  regeneratingIds: string[]
  onSelectScene: (id: string) => void
  onReplaceImage: (sceneId: string) => void
  className?: string
}

export function AssetsPanel({
  scenes,
  selectedSceneId,
  regeneratingIds,
  onSelectScene,
  onReplaceImage,
  className,
}: AssetsPanelProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-2 max-h-[70vh] overflow-y-auto',
        className
      )}
    >
      <p className="text-[9px] tracking-[0.2em] uppercase text-gold-300/70 px-1">
        Scenes
      </p>
      {scenes.map((scene, index) => {
        const regen = regeneratingIds.includes(scene.id)
        return (
          <div
            key={scene.id}
            className={cn(
              'flex gap-2 rounded-lg border p-2 cursor-pointer transition',
              selectedSceneId === scene.id
                ? 'border-gold-500/40 bg-gold-500/[0.06]'
                : 'border-white/[0.06] hover:border-white/[0.12]'
            )}
            onClick={() => onSelectScene(scene.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelectScene(scene.id)}
          >
            <div className="relative h-14 w-10 shrink-0 rounded overflow-hidden bg-black/50">
              {scene.imageUrl ? (
                <Image
                  src={scene.imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="40px"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ImageIcon className="h-4 w-4 text-luxe/30" />
                </div>
              )}
              {regen && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <Loader2 className="h-4 w-4 animate-spin text-gold-300" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-luxe/85 truncate">
                {scene.title ?? `Scene ${index + 1}`}
              </p>
              <p className="text-[9px] text-luxe/40 tabular-nums">
                {scene.durationSec.toFixed(1)}s
              </p>
              <button
                type="button"
                className="mt-1 inline-flex items-center gap-1 text-[9px] text-gold-200/80 hover:text-gold-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onReplaceImage(scene.id)
                }}
                disabled={regen}
              >
                <RefreshCw className="h-3 w-3" />
                Replace image
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
