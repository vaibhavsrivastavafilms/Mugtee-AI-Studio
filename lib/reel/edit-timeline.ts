import type { ReelTimeline, ReelTimelineClip } from '@/lib/reel/types'

export function getClipAtTime(
  timeline: ReelTimeline,
  timeSec: number
): ReelTimelineClip | null {
  if (timeline.clips.length === 0) return null
  return (
    timeline.clips.find(
      (c) => timeSec >= c.startSec && timeSec < c.endSec
    ) ?? timeline.clips[timeline.clips.length - 1]!
  )
}
