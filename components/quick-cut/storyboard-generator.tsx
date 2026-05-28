'use client'

import Image from 'next/image'
import { Camera, Clapperboard, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { resolveScenePreviewUrl } from '@/lib/cinematic/scene-preview-url'

export function StoryboardGenerator({
  scenes,
  loading = false,
  className,
}: {
  scenes: GeneratedScene[]
  loading?: boolean
  className?: string
}) {
  if (scenes.length === 0 && !loading) return null

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/30 p-4',
        loading && 'shimmer-cinematic',
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85 mb-3">
        <Clapperboard className="w-3 h-3" /> Storyboard
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {scenes.slice(0, 4).map((scene, i) => {
          const generatedUrl = scene.imageUrl?.trim()
          const previewUrl =
            generatedUrl || (!loading ? resolveScenePreviewUrl(scene, i) : null)

          return (
          <div
            key={scene.id || i}
            className="rounded-lg border border-white/[0.06] bg-black/40 overflow-hidden"
          >
            {loading && !generatedUrl ? (
              <div className="aspect-[9/16] max-h-[160px] bg-white/[0.03] flex items-center justify-center shimmer-cinematic">
                <Loader2 className="w-5 h-5 text-gold-400/50 animate-spin" />
              </div>
            ) : previewUrl ? (
              <div className="relative aspect-[9/16] max-h-[160px] w-full">
                <Image
                  src={previewUrl}
                  alt={scene.title || `Scene ${i + 1}`}
                  fill
                  sizes="160px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="aspect-[9/16] max-h-[160px] bg-white/[0.03] flex items-center justify-center">
                <Camera className="w-5 h-5 text-luxe/20" />
              </div>
            )}
            <div className="px-3 py-2.5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] tracking-[0.18em] uppercase text-gold-300/70">
                  Scene {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-luxe/40">{scene.duration ?? 4}s</span>
              </div>
              <p className="text-sm text-luxe/90 font-medium leading-snug line-clamp-1">
                {scene.title}
              </p>
              <p className="text-[11px] text-luxe/55 leading-relaxed line-clamp-2 mt-0.5">
                {scene.description || scene.visualPrompt}
              </p>
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}
