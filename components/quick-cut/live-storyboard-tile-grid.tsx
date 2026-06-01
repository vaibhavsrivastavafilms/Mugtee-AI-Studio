'use client'

import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { resolveScenePreviewUrl } from '@/lib/cinematic/scene-preview-url'
import { missionStatusLabel } from '@/lib/mission/mission-copy'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'
import { MotionPresetBadge } from '@/components/quick-cut/motion-preset-control'

const SLOT_COUNT = 4

function statusLabel(
  step?: QuickCutGenerationStep,
  sceneCount = 0,
  directingLabel?: string | null
): string {
  return missionStatusLabel(step, sceneCount, directingLabel)
}

export function LiveStoryboardTileGrid({
  scenes,
  generationStep,
  imagesLoading = false,
  directingSceneLabel,
  className,
}: {
  scenes: GeneratedScene[]
  generationStep?: QuickCutGenerationStep
  imagesLoading?: boolean
  directingSceneLabel?: string | null
  className?: string
}) {
  const slotCount = Math.max(SLOT_COUNT, Math.min(scenes.length, 8))
  const slots = Array.from({ length: slotCount }, (_, i) => scenes[i] ?? null)

  return (
    <div
      className={cn(
        'absolute inset-0 bg-gradient-to-br from-[#2B1A08] via-[#120D08] to-black flex flex-col items-center justify-center gap-3 px-4',
        className
      )}
    >
      <div className="grid grid-cols-2 gap-2 w-full max-w-[148px]">
        {slots.map((scene, i) => {
          const generatedUrl = scene?.imageUrl?.trim()
          const previewUrl =
            generatedUrl ||
            (scene && !imagesLoading ? resolveScenePreviewUrl(scene, i) : null)
          const waitingForImage = Boolean(scene && imagesLoading && !generatedUrl)
          const waitingForScene = !scene
          const sceneDirecting =
            waitingForImage && directingSceneLabel?.includes(`Scene ${i + 1}`)
              ? directingSceneLabel
              : waitingForImage
                ? `Directing Scene ${i + 1}…`
                : null

          return (
            <div
              key={scene?.id ?? `slot-${i}`}
              className={cn(
                'relative aspect-[9/16] rounded-md overflow-hidden',
                'border border-gold-500/25 bg-black/50 shadow-[0_4px_16px_rgba(0,0,0,0.45)]',
                (waitingForScene || waitingForImage) && 'shimmer-cinematic'
              )}
            >
              {previewUrl ? (
                <>
                  <Image
                    src={previewUrl}
                    alt={scene?.title || `Scene ${i + 1}`}
                    fill
                    sizes="74px"
                    className="object-cover"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 pointer-events-none"
                    aria-hidden
                  />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1208] via-[#0d0a06] to-black" />
              )}

              <div className="absolute inset-x-0 top-0 p-1 bg-gradient-to-b from-black/70 to-transparent flex items-start justify-between gap-0.5">
                <span className="text-[7px] tracking-[0.16em] uppercase text-gold-300/80">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {scene?.motionPresetId ? (
                  <MotionPresetBadge presetId={scene.motionPresetId} className="scale-90 origin-top-right" />
                ) : null}
              </div>

              {waitingForImage ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1">
                  <Loader2 className="w-3.5 h-3.5 text-gold-400/55 animate-spin" />
                  {sceneDirecting ? (
                    <span className="text-[6px] text-luxe/45 text-center leading-tight">
                      {sceneDirecting}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {scene?.title ? (
                <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black/85 to-transparent">
                  <p className="text-[6px] leading-tight text-[#F4E7C1]/75 line-clamp-2 italic">
                    {scene.title}
                  </p>
                </div>
              ) : waitingForScene ? (
                <div className="absolute inset-x-0 bottom-0 p-1">
                  <div className="h-1 w-3/4 rounded-full bg-gold-500/15" />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-luxe/45 italic text-center">
        {statusLabel(generationStep, scenes.length, directingSceneLabel)}
      </p>
    </div>
  )
}
