import type { MotionPresetId } from '@/lib/motion/motion-presets'
import { isMotionPresetId } from '@/lib/motion/motion-presets'
import type { TransitionType } from '@/lib/motion/scene-motion-types'
import type { ReelTimeline, ReelTimelineClip } from '@/lib/reel/types'

function parseVoiceSegment(raw: unknown): ReelTimelineClip['voiceSegment'] | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const text = typeof row.text === 'string' ? row.text : ''
  const startSec = typeof row.startSec === 'number' ? row.startSec : 0
  const endSec = typeof row.endSec === 'number' ? row.endSec : startSec + 4
  const audioOffsetSec = typeof row.audioOffsetSec === 'number' ? row.audioOffsetSec : startSec
  const durationSec =
    typeof row.durationSec === 'number' ? row.durationSec : Math.max(0.05, endSec - startSec)
  return { text, startSec, endSec, audioOffsetSec, durationSec }
}

function parseCaption(raw: unknown): ReelTimelineClip['caption'] | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const text = typeof row.text === 'string' ? row.text : ''
  const startSec = typeof row.startSec === 'number' ? row.startSec : 0
  const endSec = typeof row.endSec === 'number' ? row.endSec : startSec + 4
  const words = Array.isArray(row.words)
    ? row.words
        .map((w) => {
          if (!w || typeof w !== 'object') return null
          const wr = w as Record<string, unknown>
          if (typeof wr.text !== 'string') return null
          return {
            text: wr.text,
            startSec: typeof wr.startSec === 'number' ? wr.startSec : startSec,
            endSec: typeof wr.endSec === 'number' ? wr.endSec : endSec,
          }
        })
        .filter((w): w is NonNullable<typeof w> => Boolean(w))
    : []
  return { text, startSec, endSec, words }
}

function parseAnimation(raw: unknown): ReelTimelineClip['animation'] | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const presetRaw = String(row.presetId ?? 'historical_push_in')
  const presetId: MotionPresetId = isMotionPresetId(presetRaw)
    ? presetRaw
    : 'historical_push_in'
  const transition = (row.transition === 'cross_dissolve' || row.transition === 'cut'
    ? row.transition
    : 'fade') as TransitionType
  return {
    presetId,
    transition,
    motionType: typeof row.motionType === 'string' ? row.motionType : undefined,
  }
}

function parseClip(raw: unknown): ReelTimelineClip | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const sceneId = typeof row.sceneId === 'string' ? row.sceneId.trim() : ''
  if (!sceneId) return null
  const voiceSegment = parseVoiceSegment(row.voiceSegment)
  const caption = parseCaption(row.caption)
  const animation = parseAnimation(row.animation)
  if (!voiceSegment || !caption || !animation) return null

  return {
    sceneId,
    index: typeof row.index === 'number' ? row.index : 0,
    duration: typeof row.duration === 'number' ? row.duration : 4,
    startSec: typeof row.startSec === 'number' ? row.startSec : 0,
    endSec: typeof row.endSec === 'number' ? row.endSec : 4,
    image: typeof row.image === 'string' ? row.image : null,
    voiceSegment,
    caption,
    animation,
    emotion: typeof row.emotion === 'string' ? row.emotion : undefined,
    title: typeof row.title === 'string' ? row.title : undefined,
  }
}

export function parseReelTimeline(raw: unknown): ReelTimeline | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (row.version !== 1 && row.version !== undefined) return null
  const clipsRaw = Array.isArray(row.clips) ? row.clips : []
  const clips = clipsRaw.map(parseClip).filter((c): c is ReelTimelineClip => Boolean(c))
  if (clips.length === 0) return null

  return {
    version: 1,
    totalDurationSec:
      typeof row.totalDurationSec === 'number'
        ? row.totalDurationSec
        : clips[clips.length - 1]?.endSec ?? 0,
    clips,
    voiceUrl: typeof row.voiceUrl === 'string' ? row.voiceUrl : null,
    composedAt: typeof row.composedAt === 'string' ? row.composedAt : new Date().toISOString(),
  }
}

export function parseTimelineState(raw: unknown): ReelTimeline | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (row.reelTimeline) return parseReelTimeline(row.reelTimeline)
  return parseReelTimeline(raw)
}

export function timelineStateFromReelTimeline(timeline: ReelTimeline | null): Record<string, unknown> {
  if (!timeline) return {}
  return { reelTimeline: timeline }
}
