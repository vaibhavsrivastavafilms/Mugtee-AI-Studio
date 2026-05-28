import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { SubtitleSegment } from '@/lib/video/types'

function formatSrtTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.round((sec % 1) * 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

export function buildSubtitleSegmentsFromScenes(
  scenes: GeneratedScene[],
  totalDurationSec: number
): SubtitleSegment[] {
  const usable = scenes.filter((s) => s.description?.trim())
  if (usable.length === 0) return []

  const rawTotal = usable.reduce((sum, s) => sum + Math.max(2, s.duration || 4), 0)
  const scale = totalDurationSec / rawTotal
  let cursor = 0
  const segments: SubtitleSegment[] = []

  for (const scene of usable) {
    const dur = Math.max(2, (scene.duration || 4) * scale)
    const text = scene.description.replace(/\s+/g, ' ').trim().slice(0, 120)
    segments.push({
      startSec: cursor,
      endSec: Math.min(cursor + dur, totalDurationSec),
      text,
    })
    cursor += dur
  }
  return segments
}

export function segmentsToSrt(segments: SubtitleSegment[]): string {
  return segments
    .map((seg, i) => {
      const start = formatSrtTime(seg.startSec)
      const end = formatSrtTime(seg.endSec)
      return `${i + 1}\n${start} --> ${end}\n${seg.text}\n`
    })
    .join('\n')
}
