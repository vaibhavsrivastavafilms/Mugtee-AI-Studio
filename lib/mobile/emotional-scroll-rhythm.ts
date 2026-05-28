export type ScrollRhythmSegment = {
  index: number
  dwellMs: number
  label: string
  thumbSafe: boolean
}

const SEGMENT_LABELS = [
  'Opening breath',
  'Rhythm rising',
  'Emotional crest',
  'Held aftertaste',
] as const

export function buildEmotionalScrollRhythm(
  segmentCount: number,
  totalDurationSec: number,
  preferReducedMotion = false
): ScrollRhythmSegment[] {
  const count = Math.max(segmentCount, 1)
  const baseDwell = preferReducedMotion
    ? Math.max(1200, (totalDurationSec * 1000) / count * 0.7)
    : Math.max(1800, (totalDurationSec * 1000) / count * 0.85)

  return Array.from({ length: count }, (_, i) => ({
    index: i,
    dwellMs: Math.round(baseDwell * (i === 0 ? 0.9 : i === count - 1 ? 1.1 : 1)),
    label: SEGMENT_LABELS[Math.min(i, SEGMENT_LABELS.length - 1)],
    thumbSafe: true,
  }))
}

export function scrollSnapClass(preferReducedMotion: boolean): string {
  return preferReducedMotion
    ? 'scroll-smooth'
    : 'scroll-smooth snap-y snap-mandatory'
}
