import type { GeneratedScene } from '@/lib/cinematic/generation'
import { buildSceneCaptionPlan } from '@/lib/cinematic/captions/word-timing'
import type { CaptionStyleId } from '@/lib/motion/cinematic-director-engine'
import type { ReelCaptionClip } from '@/lib/remotion/reel-caption-layer'

export type SpeechRange = { startSec: number; endSec: number }

function extractKeywords(text: string): string[] {
  const stop = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'is', 'are'])
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4 && !stop.has(w))
    .slice(0, 3)
}

export function resolveExportCaptionStyle(input: {
  niche?: string
  tone?: string
  hook?: string
}): CaptionStyleId {
  const text = [input.niche, input.tone, input.hook].filter(Boolean).join(' ').toLowerCase()
  if (/\b(documentary|history|investigat|archive)\b/.test(text)) return 'documentary'
  if (/\b(motivat|inspir|hustle|success|mindset)\b/.test(text)) return 'motivational'
  if (/\b(story|emotion|heart|journey)\b/.test(text)) return 'storytelling'
  return 'creator'
}

export function buildExportCaptionTracks(input: {
  scenes: GeneratedScene[]
  totalDurationSec: number
  fallbackText?: string
  captionStyle?: CaptionStyleId
  title?: string
}): { tracks: ReelCaptionClip[]; speechRanges: SpeechRange[] } {
  const plan = buildSceneCaptionPlan(
    input.scenes,
    input.totalDurationSec,
    input.fallbackText ?? input.title ?? ''
  )
  const style = input.captionStyle ?? 'creator'

  const tracks: ReelCaptionClip[] = plan.map((row, i) => ({
    id: `caption-${row.sceneIndex}-${i}`,
    text: row.text,
    startSec: row.startSec,
    endSec: row.endSec,
    style,
    words: row.words,
    keywords: extractKeywords(row.text),
  }))

  const speechRanges: SpeechRange[] = plan.map((row) => ({
    startSec: row.startSec,
    endSec: row.endSec,
  }))

  return { tracks, speechRanges }
}
