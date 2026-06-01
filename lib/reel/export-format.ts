import { buildSrtFromCaptionCues } from '@/lib/reel/caption-sync'
import type { ReelTimeline } from '@/lib/reel/types'

export type ReelTimelineExportPayload = {
  format: 'mugtee-reel-timeline'
  version: 1
  exportedAt: string
  totalDurationSec: number
  fps: number
  resolution: { width: number; height: number }
  voiceUrl: string | null
  clips: ReelTimeline['clips']
}

const EXPORT_FPS = 30
const EXPORT_RESOLUTION = { width: 1080, height: 1920 }

export function buildTimelineJson(timeline: ReelTimeline): string {
  const payload: ReelTimelineExportPayload = {
    format: 'mugtee-reel-timeline',
    version: 1,
    exportedAt: new Date().toISOString(),
    totalDurationSec: timeline.totalDurationSec,
    fps: EXPORT_FPS,
    resolution: EXPORT_RESOLUTION,
    voiceUrl: timeline.voiceUrl,
    clips: timeline.clips,
  }
  return JSON.stringify(payload, null, 2)
}

export function buildCaptionsSrt(timeline: ReelTimeline): string {
  return buildSrtFromCaptionCues(timeline.clips.map((c) => c.caption))
}

export function buildStoryboardManifest(timeline: ReelTimeline): string {
  const frames = timeline.clips.map((clip, i) => ({
    index: i + 1,
    sceneId: clip.sceneId,
    title: clip.title,
    image: clip.image,
    startSec: clip.startSec,
    endSec: clip.endSec,
    duration: clip.duration,
    emotion: clip.emotion,
    animation: clip.animation.presetId,
    narration: clip.voiceSegment.text,
  }))
  return JSON.stringify({ frames, totalDurationSec: timeline.totalDurationSec }, null, 2)
}
