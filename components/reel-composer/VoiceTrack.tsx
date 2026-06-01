'use client'

import { cn } from '@/lib/utils'
import type { ReelTimeline } from '@/lib/reel/types'
import { TimelineTrack } from '@/components/reel-composer/TimelineTrack'

export function VoiceTrack({
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
    <TimelineTrack label="Voice" colorClass="bg-emerald-400/80" className={className}>
      {timeline.clips.map((clip) => {
        const left = (clip.startSec / total) * 100
        const width = Math.max(2, (clip.duration / total) * 100)
        const active =
          currentTimeSec >= clip.startSec && currentTimeSec < clip.endSec
        const voiceLabel = clip.voiceSegment.text.slice(0, 40) || `Scene ${clip.index + 1}`
        return (
          <button
            key={clip.sceneId}
            type="button"
            title={clip.voiceSegment.text.slice(0, 80)}
            aria-label={`Seek to voice: ${voiceLabel}`}
            onClick={() => onSeek?.(clip.startSec)}
            className={cn(
              'absolute top-0 bottom-0 border-r border-black/30 text-left px-1 overflow-hidden transition-colors',
              active
                ? 'bg-emerald-500/35 ring-1 ring-emerald-400/50'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25'
            )}
            style={{ left: `${left}%`, width: `${width}%` }}
          >
            <span className="text-[8px] text-emerald-100/80 line-clamp-2 leading-tight">
              {clip.voiceSegment.text.slice(0, 40) || `Scene ${clip.index + 1}`}
            </span>
          </button>
        )
      })}
    </TimelineTrack>
  )
}
