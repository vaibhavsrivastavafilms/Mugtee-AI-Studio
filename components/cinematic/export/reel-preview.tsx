'use client'

import { Film } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CinematicFadeImage } from '@/components/cinematic/cinematic-states'
import { CinematicExportFrame } from '@/components/cinematic/export/cinematic-export-frame'
import { DirectedExportCover } from '@/components/cinematic/export/directed-export-cover'
import { ImmersiveFilmViewer } from '@/components/cinematic/execution/immersive-film-viewer'
import {
  ImmersiveStoryViewer,
} from '@/components/cinematic/cinematic-delivery/cinematic-viewing-engine'
import { CinematicPremiereEnvironment } from '@/components/cinematic/cinematic-delivery/viewing-frame'
import { ShowcasePresenceFade } from '@/components/cinematic/cinematic-delivery/viewing-micro-motion'
import { ImmersiveShowcaseLayer } from '@/components/cinematic/cinematic-showcase/cinematic-showcase-engine'
import { ImmersiveNarrativeViewer } from '@/components/cinematic/story-evolution/story-evolution-frame'
import { ImmersiveFilmEnvironment } from '@/components/cinematic/live-cinematic/live-cinematic-frame'

export function ReelPreview({
  frames,
  hook,
  duration,
  title,
  style,
  niche,
}: {
  frames: string[]
  hook: string
  duration: number
  title: string
  style?: string | null
  niche?: string | null
}) {
  const hasFrames = frames.length > 0

  return (
    <CinematicPremiereEnvironment>
    <ShowcasePresenceFade>
    <section className="rounded-[28px] border border-white/[0.08] bg-black/30 overflow-hidden shadow-[0_0_48px_rgba(212,175,55,0.05)] cinematic-identity-glow cinematic-viewing-depth">
      <DirectedExportCover
        title={title}
        hook={hook}
        duration={duration}
        style={style}
        niche={niche}
      />

      <div className="p-3 sm:p-5 flex justify-center">
        <ImmersiveShowcaseLayer>
        <ImmersiveFilmEnvironment>
        <ImmersiveNarrativeViewer>
        <ImmersiveStoryViewer>
        <ImmersiveFilmViewer frames={frames} duration={duration}>
          {(activeFrame, activeIndex) => (
        <CinematicExportFrame>
          {activeFrame ? (
            <CinematicFadeImage
              src={activeFrame}
              alt="Reel preview frame"
              className="absolute inset-0 w-full h-full object-cover calm-opacity-transition"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#2B1A08] via-[#120D08] to-black flex items-center justify-center">
              <Film className="w-10 h-10 text-[#D4AF37]/45" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 p-4 space-y-2">
            <p className="text-[9px] tracking-[0.22em] uppercase text-[#C8A24E]/70">
              Opening beat · export-ready
            </p>
            {hook ? (
              <p className="font-display text-[15px] leading-snug text-[#F4E7C1] italic line-clamp-3">
                {hook}
              </p>
            ) : null}
          </div>

          {frames.length > 1 ? (
            <div className="absolute top-3 right-3 flex gap-1">
              {frames.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full calm-opacity-transition',
                    i === activeIndex ? 'bg-[#D4AF37]' : 'bg-white/25'
                  )}
                />
              ))}
            </div>
          ) : null}
        </CinematicExportFrame>
          )}
        </ImmersiveFilmViewer>
        </ImmersiveStoryViewer>
        </ImmersiveNarrativeViewer>
        </ImmersiveFilmEnvironment>
        </ImmersiveShowcaseLayer>
      </div>
    </section>
    </ShowcasePresenceFade>
    </CinematicPremiereEnvironment>
  )
}
