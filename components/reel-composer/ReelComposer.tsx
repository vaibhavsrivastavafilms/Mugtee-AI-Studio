'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReelTimeline } from '@/lib/reel/types'
import { getClipAtTime } from '@/lib/reel/edit-timeline'
import { getCaptionAtTime } from '@/lib/cinematic/captions/word-timing'
import { KaraokeCaptionOverlay } from '@/components/cinematic/karaoke-caption-overlay'
import { DirectorTimeline } from '@/components/reel-composer/DirectorTimeline'
import {
  clampPlaybackSec,
  formatPlaybackTime,
} from '@/lib/media/format-playback-time'
import { motionPresetLabel } from '@/lib/motion/motion-presets'

/** Preview reel — timeline, voice, captions, frames, scrubber (no full render). */
export function ReelComposer({
  timeline,
  audioRef: externalAudioRef,
  className,
  showDirectorTracks = true,
  /** Director tracks only — no duplicate 9:16 preview (use with OutputWindow / ReelAssemblyPlayer). */
  timelineOnly = false,
}: {
  timeline: ReelTimeline | null
  audioRef?: React.RefObject<HTMLAudioElement | null>
  className?: string
  showDirectorTracks?: boolean
  timelineOnly?: boolean
}) {
  const internalAudioRef = useRef<HTMLAudioElement | null>(null)
  const audioRef = externalAudioRef ?? internalAudioRef
  const [playing, setPlaying] = useState(false)
  const [currentTimeSec, setCurrentTimeSec] = useState(0)

  const totalSec = timeline?.totalDurationSec ?? 0
  const activeClip = useMemo(
    () => (timeline ? getClipAtTime(timeline, currentTimeSec) : null),
    [timeline, currentTimeSec]
  )

  const captionPlan = useMemo(() => {
    if (!timeline) return []
    return timeline.clips.map((clip) => ({
      sceneIndex: clip.index,
      text: clip.caption.text,
      startSec: clip.caption.startSec,
      endSec: clip.caption.endSec,
      words: clip.caption.words,
    }))
  }, [timeline])

  const captionState = useMemo(
    () => getCaptionAtTime(captionPlan, currentTimeSec),
    [captionPlan, currentTimeSec]
  )

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTime = () => setCurrentTimeSec(audio.currentTime)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => {
      setPlaying(false)
      setCurrentTimeSec(0)
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
    }
  }, [audioRef, timeline?.voiceUrl])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      void audio.play().catch(() => undefined)
    }
  }, [audioRef, playing])

  const seek = useCallback(
    (sec: number) => {
      const audio = audioRef.current
      const clamped = clampPlaybackSec(sec, totalSec)
      setCurrentTimeSec(clamped)
      if (audio) audio.currentTime = clamped
    },
    [audioRef, totalSec]
  )

  if (!timeline || timeline.clips.length === 0) {
    return (
      <p className={cn('text-[12px] text-luxe/50 italic py-4 text-center', className)}>
        Reel timeline will appear after voice sync.
      </p>
    )
  }

  return (
    <div className={cn(timelineOnly ? 'space-y-2' : 'space-y-3', className)}>
      {!timelineOnly ? (
      <div className="relative mx-auto w-full max-w-[220px] aspect-[9/16] rounded-xl overflow-hidden border border-gold-500/25 bg-black shadow-gold-glow/20">
        {activeClip?.image ? (
          <Image
            src={activeClip.image}
            alt=""
            fill
            sizes="220px"
            className="object-cover"
            unoptimized
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/80" />
        )}
        {captionState ? (
          <KaraokeCaptionOverlay
            words={captionState.words}
            activeIndex={captionState.activeIndex}
            className="absolute bottom-8 inset-x-2"
          />
        ) : null}
        {activeClip ? (
          <div className="absolute top-2 left-2 right-2 flex justify-between gap-1">
            <span className="text-[8px] tracking-wider uppercase text-white/70 bg-black/50 px-1.5 py-0.5 rounded">
              {activeClip.title ?? `Scene ${activeClip.index + 1}`}
            </span>
            <span className="text-[8px] text-gold-200/80 bg-black/50 px-1.5 py-0.5 rounded">
              {motionPresetLabel(activeClip.animation.presetId)}
            </span>
          </div>
        ) : null}
      </div>
      ) : null}

      {!timelineOnly ? (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!timeline.voiceUrl}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gold-500/30 bg-gold-500/10 text-gold-200 hover:bg-gold-500/20 disabled:opacity-40"
          aria-label={playing ? 'Pause preview' : 'Play preview'}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <input
          type="range"
          min={0}
          max={totalSec || 1}
          step={0.05}
          value={currentTimeSec}
          onChange={(e) => seek(Number(e.target.value))}
          className="flex-1 h-1 accent-gold-400"
          aria-label="Scrub reel timeline"
        />
        <span className="text-[10px] tabular-nums text-luxe/50 shrink-0">
          {formatPlaybackTime(currentTimeSec)} / {formatPlaybackTime(totalSec)}
        </span>
      </div>
      ) : null}

      {showDirectorTracks ? (
        <DirectorTimeline
          timeline={timeline}
          currentTimeSec={currentTimeSec}
          onSeek={seek}
        />
      ) : null}

      {timeline.voiceUrl && !externalAudioRef ? (
        <audio ref={internalAudioRef} src={timeline.voiceUrl} preload="metadata" />
      ) : null}
    </div>
  )
}
