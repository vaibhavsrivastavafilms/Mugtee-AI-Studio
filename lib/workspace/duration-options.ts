import {
  MAX_VIDEO_DURATION_SEC,
  MIN_VIDEO_DURATION_SEC,
} from '@/lib/workspace/validation'

/** Single source of truth for reel duration choices (15 / 30 / 60 seconds). */
export const REEL_DURATION_OPTIONS = [
  { value: 15, label: '15 sec' },
  { value: 30, label: '30 sec' },
  { value: 60, label: '60 sec' },
] as const

export type ReelDurationSec = (typeof REEL_DURATION_OPTIONS)[number]['value']

export const REEL_DURATION_VALUES: readonly ReelDurationSec[] = REEL_DURATION_OPTIONS.map(
  (o) => o.value
)

export function isAllowedReelDuration(raw: unknown): raw is ReelDurationSec {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
  return REEL_DURATION_VALUES.includes(n as ReelDurationSec)
}

export function normalizeReelDuration(raw: unknown): ReelDurationSec {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
  if (!Number.isFinite(n)) return MAX_VIDEO_DURATION_SEC as ReelDurationSec
  const rounded = Math.round(n)
  if (REEL_DURATION_VALUES.includes(rounded as ReelDurationSec)) {
    return rounded as ReelDurationSec
  }
  return Math.min(
    MAX_VIDEO_DURATION_SEC,
    Math.max(MIN_VIDEO_DURATION_SEC, rounded)
  ) as ReelDurationSec
}
