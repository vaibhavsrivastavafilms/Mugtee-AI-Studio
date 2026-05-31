import type { ViewerJourneySegment } from '@/lib/companion/types'

type JourneyInput = {
  script?: string
  hook?: string
  scenes?: Array<{ title?: string; description?: string; duration?: number }>
  duration?: number
}

const EMOTION_BY_POSITION = [
  'Intrigue',
  'Tension',
  'Investment',
  'Peak',
  'Release',
]

function estimateDuration(input: JourneyInput): number {
  if (input.duration && input.duration > 0) return input.duration
  const sceneSum = (input.scenes ?? []).reduce((a, s) => a + (s.duration ?? 4), 0)
  return sceneSum > 0 ? sceneSum : 60
}

function segmentLabel(index: number, total: number, sceneTitle?: string): string {
  if (sceneTitle?.trim()) return sceneTitle.trim().slice(0, 48)
  if (index === 0) return 'Opening hook'
  if (index === total - 1) return 'Closing beat'
  return `Beat ${index + 1}`
}

export function buildViewerJourney(input: JourneyInput): ViewerJourneySegment[] {
  const totalSec = estimateDuration(input)
  const scenes = input.scenes ?? []
  const segmentCount = Math.max(scenes.length, 4)

  if (scenes.length > 0) {
    let cursor = 0
    return scenes.map((scene, i) => {
      const dur = scene.duration ?? Math.round(totalSec / scenes.length)
      const startSec = cursor
      const endSec = Math.min(totalSec, cursor + dur)
      cursor = endSec
      const pos = i / Math.max(scenes.length - 1, 1)
      const intensity: ViewerJourneySegment['intensity'] =
        pos < 0.2 ? 'medium' : pos > 0.75 ? 'high' : pos > 0.45 ? 'high' : 'medium'
      return {
        startSec,
        endSec,
        label: segmentLabel(i, scenes.length, scene.title),
        emotion: EMOTION_BY_POSITION[Math.min(i, EMOTION_BY_POSITION.length - 1)],
        intensity: i === scenes.length - 1 ? 'high' : intensity,
      }
    })
  }

  const hook = input.hook ?? input.script?.split('\n')[0] ?? ''
  const scriptLines = (input.script ?? '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 8)

  const segments: ViewerJourneySegment[] = []
  const slice = totalSec / segmentCount

  for (let i = 0; i < segmentCount; i++) {
    const startSec = Math.round(i * slice)
    const endSec = Math.round((i + 1) * slice)
    segments.push({
      startSec,
      endSec,
      label:
        i === 0 && hook
          ? 'Hook'
          : scriptLines[i - 1]?.slice(0, 40) ?? segmentLabel(i, segmentCount),
      emotion: EMOTION_BY_POSITION[Math.min(i, EMOTION_BY_POSITION.length - 1)],
      intensity: i === 0 || i === segmentCount - 1 ? 'high' : i === 1 ? 'medium' : 'medium',
    })
  }

  return segments
}

export function formatJourneyTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`
}
