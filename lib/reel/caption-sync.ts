import { buildWordTimings } from '@/lib/cinematic/captions/word-timing'
import type { ReelCaptionCue, ReelVoiceSegment } from '@/lib/reel/types'

/** Build caption cue points from narration timing windows. */
export function buildCaptionCueForSegment(segment: ReelVoiceSegment): ReelCaptionCue {
  const text = segment.text.trim()
  const startSec = segment.startSec
  const endSec = segment.endSec
  return {
    text,
    startSec,
    endSec,
    words: buildWordTimings(text, startSec, endSec),
  }
}

export function buildCaptionCuesForSegments(segments: ReelVoiceSegment[]): ReelCaptionCue[] {
  return segments.map(buildCaptionCueForSegment)
}

/** SRT timestamp: 00:00:01,500 */
export function formatSrtTimestamp(sec: number): string {
  const ms = Math.max(0, Math.round(sec * 1000))
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  const remainder = ms % 1000
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(remainder).padStart(3, '0')}`
}

export function buildSrtFromCaptionCues(cues: ReelCaptionCue[]): string {
  const blocks: string[] = []
  let index = 1

  for (const cue of cues) {
    if (!cue.text.trim()) continue
    blocks.push(
      String(index),
      `${formatSrtTimestamp(cue.startSec)} --> ${formatSrtTimestamp(cue.endSec)}`,
      cue.text.trim(),
      ''
    )
    index += 1

    for (const word of cue.words) {
      if (!word.text.trim()) continue
      blocks.push(
        String(index),
        `${formatSrtTimestamp(word.startSec)} --> ${formatSrtTimestamp(word.endSec)}`,
        word.text.trim(),
        ''
      )
      index += 1
    }
  }

  return blocks.join('\n').trim()
}
