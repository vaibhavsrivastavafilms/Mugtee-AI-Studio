import { MAX_VIDEO_DURATION_SEC } from '@/lib/workspace/validation'

/** m:ss display for preview timelines; clamps to the 60s reel cap. */
export function formatPlaybackTime(
  sec: number,
  maxSec = MAX_VIDEO_DURATION_SEC
): string {
  const clamped = Math.min(Math.max(0, sec), maxSec)
  const m = Math.floor(clamped / 60)
  const s = Math.floor(clamped % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function clampPlaybackSec(
  sec: number,
  maxSec = MAX_VIDEO_DURATION_SEC
): number {
  return Math.min(Math.max(0, sec), maxSec)
}
