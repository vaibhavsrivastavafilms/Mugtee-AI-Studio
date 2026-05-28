'use client'



import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'

import { Film, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { GeneratedScene } from '@/lib/cinematic/generation'

import { resolveScenePreviewUrl } from '@/lib/cinematic/scene-preview-url'

import { StoryboardCrossfadeImage } from '@/components/cinematic/storyboard-crossfade-image'

import { KaraokeCaptionOverlay } from '@/components/cinematic/karaoke-caption-overlay'

import {

  buildSceneCaptionPlan,

  getCaptionAtTime,

} from '@/lib/cinematic/captions/word-timing'

import { useMediaPlaybackTime } from '@/hooks/use-media-playback-time'



const DEFAULT_WAVEFORM = [0.25, 0.45, 0.7, 0.55, 0.85, 0.6, 0.75, 0.4, 0.5, 0.65]



export function ReelAssemblyPlayer({

  scenes,

  title,

  hook,

  script = '',

  videoUrl,

  voiceUrl,

  audioRef: externalAudioRef,

  waveform = [],

  showSubtitles = true,

  isLive = false,

  mp4Compiling = false,

  className,

}: {

  scenes: GeneratedScene[]

  title: string

  hook: string

  script?: string

  videoUrl: string | null

  voiceUrl?: string | null

  /** Shared narration audio — when set, captions sync to this element */

  audioRef?: RefObject<HTMLAudioElement | null>

  waveform?: number[]

  showSubtitles?: boolean

  /** Progressive buildup while pipeline runs */

  isLive?: boolean

  /** Complete but MP4 still rendering or unavailable */

  mp4Compiling?: boolean

  className?: string

}) {

  const frames = useMemo(

    () => scenes.map((scene, index) => resolveScenePreviewUrl(scene, index)),

    [scenes]

  )



  const [frameIndex, setFrameIndex] = useState(0)

  const internalAudioRef = useRef<HTMLAudioElement>(null)

  const videoRef = useRef<HTMLVideoElement>(null)

  const audioRef = externalAudioRef ?? internalAudioRef



  const bars = waveform.length > 0 ? waveform : DEFAULT_WAVEFORM

  const animateFrames = isLive || mp4Compiling

  const showWaveform = animateFrames && frames.length > 0

  const hasVideo = Boolean(videoUrl)

  const syncMediaRef = (hasVideo ? videoRef : audioRef) as RefObject<HTMLMediaElement | null>

  const canSyncCaptions = Boolean(hasVideo || voiceUrl)



  const { currentTime, duration } = useMediaPlaybackTime(

    syncMediaRef,

    canSyncCaptions && showSubtitles,

    hasVideo ? videoUrl : voiceUrl

  )



  const captionPlan = useMemo(

    () => buildSceneCaptionPlan(scenes, duration || 53, hook || script),

    [scenes, duration, hook, script]

  )



  const captionState = useMemo(() => {

    if (!showSubtitles || !canSyncCaptions || duration <= 0) return null

    return getCaptionAtTime(captionPlan, currentTime)

  }, [showSubtitles, canSyncCaptions, duration, captionPlan, currentTime])



  useEffect(() => {

    setFrameIndex(0)

  }, [frames.length, frames[frames.length - 1]])



  useEffect(() => {

    if (hasVideo || frames.length < 2) return

    if (voiceUrl && duration > 0 && captionState) {

      setFrameIndex(captionState.sceneIndex)

      return

    }

    const id = window.setInterval(() => {

      setFrameIndex((i) => (i + 1) % frames.length)

    }, animateFrames ? 2800 : 3200)

    return () => window.clearInterval(id)

  }, [

    frames.length,

    hasVideo,

    animateFrames,

    voiceUrl,

    duration,

    captionState?.sceneIndex,

  ])



  const currentFrame = frames[frameIndex] ?? frames[frames.length - 1]

  const showKaraoke = showSubtitles && captionState && captionState.words.length > 0

  const showStaticCaption = showSubtitles && hook && !showKaraoke



  return (

    <div className={cn('relative mx-auto w-full max-w-[280px] space-y-3', className)}>

      {!externalAudioRef && voiceUrl && !hasVideo ? (

        <audio

          ref={internalAudioRef}

          src={voiceUrl}

          preload="metadata"

          className="sr-only"

          aria-hidden

        />

      ) : null}



      <div className="absolute -inset-4 rounded-[1.75rem] bg-gold-500/[0.08] blur-xl" />

      <div className="relative aspect-[9/16] rounded-[1.25rem] overflow-hidden border border-gold-500/25 bg-black shadow-cinema">

        {hasVideo ? (

          <video

            ref={videoRef}

            src={videoUrl!}

            controls

            autoPlay

            playsInline

            preload="metadata"

            className="h-full w-full object-cover"

          />

        ) : currentFrame && scenes.length > 0 ? (

          <>

            <StoryboardCrossfadeImage

              key={currentFrame}

              src={currentFrame}

              alt={scenes[frameIndex]?.title || 'Scene preview'}

            />

            <div

              className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none"

              aria-hidden

            />

          </>

        ) : isLive ? (

          <div className="absolute inset-0 bg-gradient-to-br from-[#2B1A08] via-[#120D08] to-black flex flex-col items-center justify-center gap-3 px-6">

            <Film className="w-9 h-9 text-gold-400/35" />

            <div className="grid grid-cols-2 gap-2 w-full max-w-[140px]">

              {Array.from({ length: 4 }).map((_, i) => (

                <div

                  key={i}

                  className="aspect-[9/16] rounded-md border border-dashed border-gold-500/20 bg-white/[0.02] shimmer-cinematic"

                />

              ))}

            </div>

            <p className="text-[11px] text-luxe/45 italic text-center">

              Building your storyboard…

            </p>

          </div>

        ) : (

          <div className="flex h-full items-center justify-center text-sm text-luxe/40 italic px-6 text-center">

            Assembling your reel…

          </div>

        )}



        {isLive && frames.length > 0 ? (

          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/55 border border-gold-500/25 text-[8px] tracking-[0.14em] uppercase text-gold-200/80">

            <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />

            Live

          </div>

        ) : null}



        {mp4Compiling && !hasVideo ? (

          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/55 border border-gold-500/25 text-[8px] tracking-[0.12em] uppercase text-gold-200/75">

            <Loader2 className="w-3 h-3 animate-spin" />

            MP4 compiling…

          </div>

        ) : null}



        {showWaveform && !hasVideo ? (

          <div

            className="absolute inset-x-0 bottom-14 flex items-end justify-center gap-[3px] h-7 px-8 pointer-events-none"

            aria-hidden

          >

            {bars.slice(0, 12).map((h, i) => (

              <span

                key={i}

                className="w-1 rounded-full bg-gold-400/75 origin-bottom animate-pulse"

                style={{

                  height: `${Math.round(h * 28)}px`,

                  animationDelay: `${i * 70}ms`,

                }}

              />

            ))}

          </div>

        ) : null}



        {showKaraoke ? (

          <KaraokeCaptionOverlay

            words={captionState!.words}

            activeIndex={captionState!.activeIndex}

            title={!hasVideo ? title : undefined}

          />

        ) : (

          <div className="absolute inset-x-0 bottom-0 p-3 space-y-1 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">

            {title && !hasVideo ? (

              <p className="text-[9px] tracking-[0.2em] uppercase text-gold-300/70 truncate">

                {title}

              </p>

            ) : null}

            {showStaticCaption ? (

              <p className="font-display text-[13px] text-[#F4E7C1] italic leading-snug line-clamp-2">

                {hook}

              </p>

            ) : null}

          </div>

        )}

      </div>



      {animateFrames && frames.length > 1 ? (

        <div className="flex gap-1.5 justify-center px-1">

          {frames.map((url, i) => (

            <button

              key={`${url}-${i}`}

              type="button"

              onClick={() => setFrameIndex(i)}

              className={cn(

                'relative w-10 aspect-[9/16] rounded-md overflow-hidden border transition-all',

                i === frameIndex

                  ? 'border-gold-400/60 ring-1 ring-gold-400/30'

                  : 'border-white/10 opacity-60 hover:opacity-90'

              )}

            >

              <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />

            </button>

          ))}

        </div>

      ) : null}

    </div>

  )

}


