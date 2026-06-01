'use client'

import { cn } from '@/lib/utils'
import type { ReelTimeline } from '@/lib/reel/types'
import { TimelineTrack } from '@/components/reel-composer/TimelineTrack'

export function CaptionTrack({
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
    <TimelineTrack label="Captions" colorClass="bg-sky-400/80" className={className}>
      {timeline.clips.map((clip) => {
        const capStart = clip.caption.startSec
        const capEnd = clip.caption.endSec
        const left = (capStart / total) * 100
        const width = Math.max(2, ((capEnd - capStart) / total) * 100)
        const active =
          currentTimeSec >= capStart && currentTimeSec < capEnd
        const captionPreview = clip.caption.text.slice(0, 36) || 'Caption'
        return (
          <button
            key={`cap-${clip.sceneId}`}
            type="button"
            title={clip.caption.text}
            aria-label={`Seek to caption: ${captionPreview}`}
            onClick={() => onSeek?.(capStart)}
            className={cn(
              'absolute top-0 bottom-0 border-r border-black/30 text-left px-1 overflow-hidden transition-colors',
              active
                ? 'bg-sky-500/35 ring-1 ring-sky-400/50'
                : 'bg-sky-500/15 hover:bg-sky-500/25'
            )}
            style={{ left: `${left}%`, width: `${width}%` }}
          >
            <span className="text-[8px] text-sky-100/80 line-clamp-2 leading-tight">
              {clip.caption.text.slice(0, 36) || '…'}
            </span>
          </button>
        )
      })}
    </TimelineTrack>
  )
}
