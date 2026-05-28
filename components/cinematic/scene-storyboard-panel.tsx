'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { getActiveStoryboardImage } from '@/lib/cinematic/storyboard-utils'
import { ContinuityBadge } from '@/components/cinematic/continuity-badge'
import { CinematicFrameOverlay } from '@/components/cinematic/cinematic-frame-overlay'
import { CinematicFrameLabel } from '@/components/cinematic/cinematic-frame-label'
import { StoryboardCrossfadeImage } from '@/components/cinematic/storyboard-crossfade-image'
import { VisualIntensityMeter } from '@/components/cinematic/visual-intensity-meter'
import { CinematicShimmer } from '@/components/cinematic/cinematic-states'
import {
  ImmersiveFrameComposition,
  CinematicShotPresence,
} from '@/components/cinematic/story-world/frame-immersion'
import type { CinematicScene, StoryboardImage } from '@/stores/cinematic-project'

export const SceneStoryboardPanel = memo(function SceneStoryboardPanel({
  scene,
  loading,
  failed,
  onSelectVariant,
}: {
  scene: CinematicScene
  loading?: boolean
  failed?: boolean
  onSelectVariant: (imageId: string) => void
}) {
  const images = scene.storyboardImages ?? []
  const active = getActiveStoryboardImage(scene)
  const activeId = scene.activeStoryboardId || active?.id
  const preserveUrl = active?.url

  if (loading && images.length === 0) {
    return (
      <div className="border-b border-white/[0.06] bg-black/20">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_92px] gap-3 p-3 sm:p-4 min-h-[min(48dvh,380px)] md:min-h-[252px]">
          <CinematicShimmer className="aspect-[16/10] md:aspect-auto md:min-h-[220px] min-h-[min(40dvh,320px)] rounded-2xl" />
          <div className="flex md:flex-col gap-2 overflow-x-auto scroll-snap-storyboard scroll-touch scrollbar-luxe pb-1 md:pb-0">
            {[0, 1, 2].map((i) => (
              <CinematicShimmer
                key={i}
                className="shrink-0 w-[88px] h-[60px] md:w-full md:h-[68px] rounded-xl snap-start"
              />
            ))}
          </div>
        </div>
        <ContinuityBadge visible />
      </div>
    )
  }

  if (loading && preserveUrl) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-[1fr_92px] gap-3 p-3 sm:p-4 border-b border-white/[0.06] bg-black/20">
        <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[220px] min-h-[min(40dvh,320px)] rounded-2xl overflow-hidden border border-white/[0.08]">
          <StoryboardCrossfadeImage
            src={preserveUrl}
            alt={`Scene ${scene.index} storyboard`}
            parallax
          />
          <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] pointer-events-none" />
          <div className="absolute inset-0 shimmer-cinematic opacity-40 pointer-events-none" />
          <div className="absolute bottom-3 left-3 right-3 text-center">
            <p className="text-[9px] tracking-[0.2em] uppercase text-[#C8A24E]/75">
              Refining frame · visual continuity preserved
            </p>
          </div>
        </div>
        <VariantRail
          images={images}
          activeId={activeId}
          onSelectVariant={onSelectVariant}
        />
      </div>
    )
  }

  if ((!active && images.length === 0) || failed) {
    return (
      <div className="relative aspect-[16/10] md:aspect-[2.2/1] md:min-h-[200px] bg-gradient-to-br from-[#2B1A08] via-[#120D08] to-black border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-[10px] tracking-[0.28em] uppercase text-[#C8A24E]/60">
            {failed ? 'Frames resting' : 'Storyboard preview'}
          </p>
          {failed ? (
            <p className="text-xs text-white/40 max-w-xs leading-relaxed">
              Visual frames are resting. Refine the storyboard frame to try again — your scene pacing is preserved.
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_92px] gap-3 p-3 sm:p-4">
      <ImmersiveFrameComposition sceneIndex={scene.index} seed={scene.index % 3}>
        <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[220px] rounded-2xl overflow-hidden border border-white/[0.08] group storyboard-scene-transition storyboard-edge-fade cinematic-environment-focus">
          <StoryboardCrossfadeImage
            src={active!.url}
            alt={`Scene ${scene.index} storyboard`}
            parallax
          />
          <CinematicFrameOverlay
            sceneIndex={scene.index}
            variantLabel={active!.variantLabel}
            active
          />
          <div className="absolute top-3 left-3 z-[2]">
            <CinematicFrameLabel scene={scene} />
          </div>
          <div className="absolute top-3 right-3 hidden sm:block z-[2]">
            <VisualIntensityMeter
              level={Math.min(5, 2 + (scene.index % 3))}
              className="px-2 py-1 rounded-full bg-black/50 border border-white/[0.06]"
            />
          </div>
          <div className="absolute bottom-3 left-3 right-3 z-[2] flex justify-center sm:justify-start">
            <CinematicShotPresence sceneIndex={scene.index} seed={scene.index % 3} />
          </div>
        </div>
      </ImmersiveFrameComposition>

      <VariantRail
        images={images}
        activeId={activeId}
        onSelectVariant={onSelectVariant}
      />
    </div>
  )
})

function VariantRail({
  images,
  activeId,
  onSelectVariant,
}: {
  images: StoryboardImage[]
  activeId?: string
  onSelectVariant: (imageId: string) => void
}) {
  return (
    <div className="flex md:flex-col gap-2 overflow-x-auto scroll-snap-storyboard scroll-touch scrollbar-luxe pb-1 md:pb-0 -mx-1 px-1">
      {images.map((image) => (
        <VariantThumb
          key={image.id}
          image={image}
          active={image.id === activeId}
          onSelect={() => onSelectVariant(image.id)}
        />
      ))}
    </div>
  )
}

const VariantThumb = memo(function VariantThumb({
  image,
  active,
  onSelect,
}: {
  image: StoryboardImage
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative shrink-0 snap-start w-[88px] h-[60px] md:w-full md:h-[68px] rounded-xl overflow-hidden border transition-all duration-300 min-h-[44px]',
        active
          ? 'border-[#D4AF37]/50 ring-1 ring-[#D4AF37]/30 storyboard-focus-halo'
          : 'border-white/[0.08] hover:border-[#D4AF37]/25 storyboard-variant-inactive hover:opacity-80'
      )}
      aria-label={`Select ${image.variantLabel}`}
      aria-pressed={active}
    >
      <StoryboardCrossfadeImage
        src={image.url}
        alt={image.variantLabel}
        className="rounded-xl"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
      <span className="absolute bottom-1 left-1 right-1 text-[8px] tracking-wider uppercase text-white/70 truncate text-left pointer-events-none">
        {image.variantLabel.split(' ')[0]}
      </span>
    </button>
  )
})
