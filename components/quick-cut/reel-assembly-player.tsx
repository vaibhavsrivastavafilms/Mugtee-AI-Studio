'use client'



import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'

import { Loader2, Pause, Play } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { GeneratedScene } from '@/lib/cinematic/generation'

import { resolveScenePreviewUrl } from '@/lib/cinematic/scene-preview-url'

import { StoryboardCrossfadeImage } from '@/components/cinematic/storyboard-crossfade-image'

import { LiveStoryboardTileGrid } from '@/components/quick-cut/live-storyboard-tile-grid'

import {
  useQuickCutGenerationStore,
  type QuickCutGenerationStep,
} from '@/stores/quick-cut-generation-store'

import { KaraokeCaptionOverlay } from '@/components/cinematic/karaoke-caption-overlay'

import {

  buildSceneCaptionPlan,

  getCaptionAtTime,

} from '@/lib/cinematic/captions/word-timing'

import { useMediaPlaybackTime } from '@/hooks/use-media-playback-time'

import { computeRenderTotalSec } from '@/lib/cinematic/scene-duration'

import {
  clampPlaybackSec,
  formatPlaybackTime,
} from '@/lib/media/format-playback-time'

import { QuickCutProjectTranscriptDialog } from '@/components/quick-cut/project-transcript-dialog'
import { QuickCutPlayerMp4Download } from '@/components/quick-cut/project-mp4-button'



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

  generationStep,

  autoPlayPreview = false,

  projectId,

  canCompileMp4,

  onVideoUrl,

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

  /** Pipeline step — drives live tile grid vs crossfade preview */

  generationStep?: QuickCutGenerationStep

  /** Start slideshow or narration once on export complete */

  autoPlayPreview?: boolean

  /** Director export — compile via saved project id */
  projectId?: string

  canCompileMp4?: boolean

  onVideoUrl?: (url: string) => void

  className?: string

}) {

  const frames = useMemo(

    () => scenes.map((scene, index) => resolveScenePreviewUrl(scene, index)),

    [scenes]

  )



  const [frameIndex, setFrameIndex] = useState(0)
  const [slideshowPlaying, setSlideshowPlaying] = useState(false)
  const [slideshowTime, setSlideshowTime] = useState(0)
  const slideshowRafRef = useRef<number | null>(null)
  const slideshowTimeRef = useRef(0)

  const internalAudioRef = useRef<HTMLAudioElement>(null)

  const videoRef = useRef<HTMLVideoElement>(null)

  const audioRef = externalAudioRef ?? internalAudioRef



  const bars = waveform.length > 0 ? waveform : DEFAULT_WAVEFORM

  const hasVideo = Boolean(videoUrl)

  const imagesLoading = generationStep === 'images'
  const directingSceneLabel = useQuickCutGenerationStore((s) =>
    isLive ? s.directingSceneLabel : null
  )
  const reviewReady =
    generationStep === 'complete' ||
    generationStep === 'render' ||
    generationStep === 'voice' ||
    mp4Compiling

  const showLiveTiles =

    isLive &&

    !hasVideo &&

    !reviewReady &&

    (scenes.length === 0 ||

      generationStep === 'analyzing' ||

      generationStep === 'title' ||

      generationStep === 'hook' ||

      generationStep === 'script' ||

      generationStep === 'scenes' ||

      generationStep === 'images')

  const storyboardPreview =
    !hasVideo &&
    !voiceUrl &&
    frames.length > 0 &&
    !showLiveTiles &&
    (!isLive || reviewReady)
  const animateFrames = isLive || mp4Compiling || storyboardPreview

  const syncMediaRef = (hasVideo ? videoRef : audioRef) as RefObject<HTMLMediaElement | null>

  const canSyncCaptions = Boolean(hasVideo || voiceUrl || (storyboardPreview && slideshowPlaying))

  const trackMediaPlayback = Boolean(hasVideo || voiceUrl)

  const { currentTime, duration, isPlaying } = useMediaPlaybackTime(

    syncMediaRef,

    trackMediaPlayback,

    hasVideo ? videoUrl : voiceUrl

  )

  const showWaveform =
    (slideshowPlaying || (voiceUrl && isPlaying) || isLive || mp4Compiling) &&
    frames.length > 0 &&
    !hasVideo

  const estimatedDuration = useMemo(() => {
    const sceneEstimate = computeRenderTotalSec(scenes)
    const mediaDuration = duration > 0 ? duration : sceneEstimate
    return Math.max(mediaDuration, sceneEstimate, 1)
  }, [duration, scenes])



  const previewTime =

    storyboardPreview && !voiceUrl ? slideshowTime : currentTime



  const totalDuration = estimatedDuration

  const timelineTime = clampPlaybackSec(previewTime, totalDuration)

  const captionPlan = useMemo(

    () => buildSceneCaptionPlan(scenes, estimatedDuration, hook || script),

    [scenes, estimatedDuration, hook, script]

  )



  const captionState = useMemo(() => {

    if (!showSubtitles || !canSyncCaptions) return null

    return getCaptionAtTime(captionPlan, previewTime)

  }, [showSubtitles, canSyncCaptions, captionPlan, previewTime])



  useEffect(() => {

    setFrameIndex(0)
    setSlideshowPlaying(false)
    setSlideshowTime(0)
    slideshowTimeRef.current = 0

  }, [frames.length, frames[frames.length - 1]])



  useEffect(() => {

    if (!storyboardPreview || !slideshowPlaying) {

      if (slideshowRafRef.current !== null) {

        cancelAnimationFrame(slideshowRafRef.current)

        slideshowRafRef.current = null

      }

      return

    }



    const startedAt = performance.now() - slideshowTimeRef.current * 1000

    const tick = (now: number) => {

      const elapsed = (now - startedAt) / 1000

      slideshowTimeRef.current = elapsed

      setSlideshowTime(elapsed)

      slideshowRafRef.current = requestAnimationFrame(tick)

    }



    slideshowRafRef.current = requestAnimationFrame(tick)

    return () => {

      if (slideshowRafRef.current !== null) cancelAnimationFrame(slideshowRafRef.current)

      slideshowRafRef.current = null

    }

  }, [storyboardPreview, slideshowPlaying])



  const seekTimeline = (value: number) => {

    if (!Number.isFinite(value)) return

    const clamped = clampPlaybackSec(value, totalDuration)



    if (hasVideo) {

      const media = videoRef.current

      if (media) media.currentTime = clamped

      return

    }

    if (voiceUrl) {

      const media = audioRef.current

      if (media) media.currentTime = clamped

      return

    }

    if (storyboardPreview) {

      slideshowTimeRef.current = clamped

      setSlideshowTime(clamped)

    }

  }



  const autoPlayStartedRef = useRef(false)

  useEffect(() => {
    if (!autoPlayPreview || autoPlayStartedRef.current || hasVideo) return
    if (frames.length < 1) return
    autoPlayStartedRef.current = true
    if (voiceUrl) {
      const media = audioRef.current
      if (media) void media.play().catch(() => {})
      return
    }
    if (storyboardPreview) setSlideshowPlaying(true)
  }, [autoPlayPreview, hasVideo, voiceUrl, frames.length, storyboardPreview, audioRef])

  const togglePlayback = () => {

    if (hasVideo) {

      const media = videoRef.current

      if (!media) return

      if (media.paused) void media.play()

      else media.pause()

      return

    }

    if (voiceUrl) {

      const media = audioRef.current

      if (!media) return

      if (media.paused) void media.play()

      else media.pause()

      return

    }

    if (storyboardPreview) {

      setSlideshowPlaying((playing) => !playing)

    }

  }



  useEffect(() => {

    if (hasVideo || frames.length < 2) return

    if (voiceUrl && captionState && (isPlaying || !isLive)) {

      setFrameIndex(captionState.sceneIndex)

      return

    }

    if (storyboardPreview && slideshowPlaying && captionState) {

      setFrameIndex(captionState.sceneIndex)

      return

    }

    const shouldCycle =
      mp4Compiling ||
      (storyboardPreview && slideshowPlaying) ||
      (voiceUrl && isPlaying) ||
      (isLive && !voiceUrl && !hasVideo)

    if (!shouldCycle) return

    const intervalMs =
      slideshowPlaying || isLive || mp4Compiling ? 2800 : storyboardPreview ? 4200 : 3200

    const id = window.setInterval(() => {

      setFrameIndex((i) => (i + 1) % frames.length)

    }, intervalMs)

    return () => window.clearInterval(id)

  }, [

    frames.length,

    hasVideo,

    animateFrames,

    voiceUrl,

    isLive,

    isPlaying,

    captionState?.sceneIndex,

    storyboardPreview,

    slideshowPlaying,

    mp4Compiling,

  ])



  const currentFrame = frames[frameIndex] ?? frames[frames.length - 1]

  const showKaraoke = showSubtitles && captionState && captionState.words.length > 0

  const showStaticCaption = showSubtitles && hook && !showKaraoke && !voiceUrl && !slideshowPlaying

  const previewIsPlaying = hasVideo || voiceUrl ? isPlaying : slideshowPlaying

  const hasPlaybackProgress =
    hasVideo || voiceUrl ? currentTime > 0.25 : slideshowTime > 0.25

  const playControlLabel = previewIsPlaying
    ? 'Pause'
    : hasPlaybackProgress
      ? 'Resume'
      : hasVideo
        ? 'Play video'
        : 'Play preview'

  const canPlayPreview =

    (hasVideo || Boolean(voiceUrl) || storyboardPreview) &&

    !showLiveTiles &&

    (hasVideo || frames.length > 0)



  return (

    <div className={cn('relative mx-auto w-full max-w-[280px] space-y-3', className)}>

      {!hasVideo && voiceUrl ? (
        <audio
          ref={audioRef as RefObject<HTMLAudioElement>}
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
            playsInline
            preload="metadata"
            className="h-full w-full object-cover cursor-pointer"
            onClick={togglePlayback}
          />

        ) : showLiveTiles ? (

          <LiveStoryboardTileGrid

            scenes={scenes}

            generationStep={generationStep}

            imagesLoading={imagesLoading}

            directingSceneLabel={directingSceneLabel}

          />

        ) : currentFrame && frames.length > 0 ? (

          <>

            <StoryboardCrossfadeImage

              key={currentFrame}

              src={currentFrame}

              alt={scenes[frameIndex]?.title || 'Scene preview'}

              parallax={storyboardPreview || isPlaying || slideshowPlaying}

            />

            <div

              className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none"

              aria-hidden

            />

          </>

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



        {canPlayPreview && !previewIsPlaying ? (

          <button

            type="button"

            onClick={togglePlayback}

            className="absolute inset-0 z-[2] flex items-center justify-center bg-black/0 hover:bg-black/15 transition-colors"

            aria-label={playControlLabel}

          >

            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gold-500/40 bg-black/55 text-gold-100 shadow-lg backdrop-blur-sm">

              <Play className="h-5 w-5 ml-0.5" aria-hidden />

            </span>

          </button>

        ) : canPlayPreview && previewIsPlaying ? (

          <button

            type="button"

            onClick={togglePlayback}

            className="absolute bottom-3 right-3 z-[3] flex h-9 w-9 items-center justify-center rounded-full border border-gold-500/40 bg-black/60 text-gold-100 shadow-lg backdrop-blur-sm opacity-90 hover:opacity-100 transition-opacity"

            aria-label={hasVideo ? 'Pause video' : 'Pause preview'}

          >

            <Pause className="h-4 w-4" aria-hidden />

          </button>

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

            ) : voiceUrl && !hasVideo && !previewIsPlaying ? (

              <p className="text-[10px] tracking-[0.12em] uppercase text-gold-300/55">

                Tap to play preview

              </p>

            ) : storyboardPreview && !previewIsPlaying ? (

              <p className="text-[10px] tracking-[0.12em] uppercase text-gold-300/55">

                Tap play to preview reel

              </p>

            ) : null}

          </div>

        )}

      </div>



      {canPlayPreview ? (

        <div className="space-y-1.5 w-full">

          <div className="flex items-center gap-2.5">

            <button

              type="button"

              onClick={togglePlayback}

              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-500/35 bg-black/45 text-gold-100/90 hover:bg-black/60 transition-colors"

              aria-label={previewIsPlaying ? 'Pause preview' : playControlLabel}

            >

              {previewIsPlaying ? (

                <Pause className="h-3.5 w-3.5" aria-hidden />

              ) : (

                <Play className="h-3.5 w-3.5 ml-0.5" aria-hidden />

              )}

            </button>



            <div className="relative flex-1 min-w-0">

              <div

                className="pointer-events-none absolute inset-y-0 left-0 right-0 my-auto h-0.5 rounded-full bg-white/10"

                aria-hidden

              >

                <div

                  className="h-full rounded-full bg-gold-400/85 transition-[width] duration-75"

                  style={{

                    width: `${totalDuration > 0 ? (timelineTime / totalDuration) * 100 : 0}%`,

                  }}

                />

              </div>

              <input

                type="range"

                min={0}

                max={totalDuration || 1}

                step={0.05}

                value={timelineTime}

                onChange={(e) => seekTimeline(Number(e.target.value))}

                className="relative z-[1] w-full h-4 cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gold-400/70 [&::-webkit-slider-thumb]:bg-gold-200 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-gold-400/70 [&::-moz-range-thumb]:bg-gold-200"

                aria-label="Preview timeline"

                aria-valuetext={`${formatPlaybackTime(timelineTime)} of ${formatPlaybackTime(totalDuration)}`}

              />

            </div>

          </div>



          <div className="flex items-center justify-center gap-2 flex-wrap">

            <p className="text-[10px] tabular-nums tracking-wide text-gold-300/55">

              {formatPlaybackTime(timelineTime)} / {formatPlaybackTime(totalDuration)}

            </p>

            <QuickCutProjectTranscriptDialog
              compact
              script={script}
              hook={hook}
              scenes={scenes}
              triggerClassName="rounded-full border-gold-500/30 bg-black/45 min-h-[28px] px-3 py-1 text-gold-100/90 hover:bg-black/60"
            />

            <QuickCutPlayerMp4Download
              projectId={projectId}
              videoUrl={videoUrl}
              title={title}
              canCompileMp4={canCompileMp4}
              onVideoUrl={onVideoUrl}
            />

          </div>

        </div>

      ) : null}



      {!canPlayPreview && (scenes.length > 0 || hook || script) ? (

        <div className="flex items-center justify-center gap-2 flex-wrap">

          <QuickCutProjectTranscriptDialog
            script={script}
            hook={hook}
            scenes={scenes}
            triggerClassName="rounded-full border-gold-500/30 bg-black/45 min-h-[32px] px-4 py-1.5 text-gold-100/90 hover:bg-black/60"
          />

          <QuickCutPlayerMp4Download
            projectId={projectId}
            videoUrl={videoUrl}
            title={title}
            canCompileMp4={canCompileMp4}
            onVideoUrl={onVideoUrl}
            triggerClassName="min-h-[32px] px-4 py-1.5"
          />

        </div>

      ) : null}



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


