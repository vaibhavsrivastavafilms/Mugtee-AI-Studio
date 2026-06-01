'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Player, type PlayerRef } from '@remotion/player'
import { Pause, Play } from 'lucide-react'
import { MugteeComposition, mugteeDurationInFrames } from '@/lib/remotion/compositions/MugteeComposition'
import { MUGTEE_TIMELINE_COMPOSITION_ID, REEL_FPS } from '@/lib/remotion/compositions/constants'
import { timelineToMugteeCompositionProps } from '@/lib/timeline/to-remotion-props'
import type { TimelineProject } from '@/types/timeline'
import { cn } from '@/lib/utils'
import { formatPlaybackTime } from '@/lib/media/format-playback-time'

type PreviewPlayerProps = {
  timeline: TimelineProject
  playheadSec: number
  onPlayheadSecChange: (sec: number) => void
  className?: string
}

export function PreviewPlayer({
  timeline,
  playheadSec,
  onPlayheadSecChange,
  className,
}: PreviewPlayerProps) {
  const playerRef = useRef<PlayerRef>(null)
  const [playing, setPlaying] = useState(false)

  const inputProps = useMemo(
    () => timelineToMugteeCompositionProps(timeline),
    [timeline]
  )

  const durationInFrames = mugteeDurationInFrames(inputProps.scenes)
  const { width, height } = timeline.resolution

  useEffect(() => {
    const frame = Math.round(playheadSec * REEL_FPS)
    playerRef.current?.seekTo(frame)
  }, [playheadSec])

  const togglePlay = useCallback(() => {
    const ref = playerRef.current
    if (!ref) return
    if (playing) {
      ref.pause()
      setPlaying(false)
    } else {
      ref.play()
      setPlaying(true)
    }
  }, [playing])

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div
        className="relative mx-auto w-full max-w-[280px] rounded-xl overflow-hidden border border-white/[0.08] bg-black shadow-gold-glow/20"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <Player
          ref={playerRef}
          component={MugteeComposition}
          inputProps={inputProps}
          durationInFrames={durationInFrames}
          compositionWidth={width}
          compositionHeight={height}
          fps={REEL_FPS}
          style={{ width: '100%', height: '100%' }}
          controls={false}
          loop
          numberOfSharedAudioTags={2}
          initiallyMuted={false}
          clickToPlay={false}
        />
      </div>

      <div className="flex items-center gap-3 px-1">
        <button
          type="button"
          onClick={togglePlay}
          className="rounded-full border border-gold-500/30 bg-gold-500/10 p-2 text-gold-200 hover:bg-gold-500/20"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={timeline.totalDurationSec}
          step={1 / REEL_FPS}
          value={playheadSec}
          onChange={(e) => onPlayheadSecChange(Number(e.target.value))}
          className="flex-1 accent-gold-500"
          aria-label="Scrub timeline"
        />
        <span className="text-[10px] tabular-nums text-luxe/50 min-w-[4.5rem] text-right">
          {formatPlaybackTime(playheadSec)} /{' '}
          {formatPlaybackTime(timeline.totalDurationSec)}
        </span>
      </div>
      <p className="text-[9px] text-luxe/40 text-center">
        Remotion preview · {MUGTEE_TIMELINE_COMPOSITION_ID} · {width}×{height}
      </p>
    </div>
  )
}
