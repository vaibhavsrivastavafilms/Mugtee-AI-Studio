'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { ReelTimeline } from '@/lib/reel/types'
import { motionPresetLabel } from '@/lib/motion/motion-presets'
import { TimelineTrack } from '@/components/reel-composer/TimelineTrack'
import { VoiceTrack } from '@/components/reel-composer/VoiceTrack'
import { CaptionTrack } from '@/components/reel-composer/CaptionTrack'

/** Director View — Voice / Visual / Caption tracks (Phase 9). */
export function DirectorTimeline({
  timeline,
  currentTimeSec,
  onSeek,
  className,
}: {
  timeline: ReelTimeline
  currentTimeSec: number
  onSeek?: (sec: number) => void
  className?: string
}) {
  const total = timeline.totalDurationSec || 1

  return (
    <div className={cn('space-y-2', className)} aria-label="Director timeline">
      <VisualTrack
        timeline={timeline}
        currentTimeSec={currentTimeSec}
        total={total}
        onSeek={onSeek}
      />
      <VoiceTrack
        timeline={timeline}
        currentTimeSec={currentTimeSec}
        onSeek={onSeek}
      />
      <CaptionTrack
        timeline={timeline}
        currentTimeSec={currentTimeSec}
        onSeek={onSeek}
      />
    </div>
  )
}

function VisualTrack({
  timeline,
  currentTimeSec,
  total,
  onSeek,
}: {
  timeline: ReelTimeline
  currentTimeSec: number
  total: number
  onSeek?: (sec: number) => void
}) {
  return (
    <TimelineTrack label="Visual" colorClass="bg-gold-400/80">
      {timeline.clips.map((clip) => {
        const left = (clip.startSec / total) * 100
        const width = Math.max(2, (clip.duration / total) * 100)
        const active =
          currentTimeSec >= clip.startSec && currentTimeSec < clip.endSec
        const clipLabel = clip.title ?? `Scene ${clip.index + 1}`
        return (
          <button
            key={`vis-${clip.sceneId}`}
            type="button"
            title={`${clipLabel} · ${motionPresetLabel(clip.animation.presetId)}`}
            aria-label={`Seek to ${clipLabel}`}
            onClick={() => onSeek?.(clip.startSec)}
            className={cn(
              'absolute top-0 bottom-0 border-r border-black/40 overflow-hidden transition-colors group',
              active
                ? 'ring-1 ring-gold-400/60 z-10'
                : 'hover:brightness-110'
            )}
            style={{ left: `${left}%`, width: `${width}%` }}
          >
            {clip.image ? (
              <Image
                src={clip.image}
                alt=""
                fill
                sizes="80px"
                className="object-cover opacity-80 group-hover:opacity-100"
                unoptimized
              />
            ) : (
              <span className="absolute inset-0 bg-white/[0.04]" />
            )}
            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[7px] text-gold-200/90 px-0.5 truncate">
              {motionPresetLabel(clip.animation.presetId)}
            </span>
          </button>
        )
      })}
    </TimelineTrack>
  )
}
