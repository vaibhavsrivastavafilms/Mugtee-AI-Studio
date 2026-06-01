import type { WordTiming } from '@/lib/cinematic/captions/word-timing'
import type { MotionPresetId } from '@/lib/motion/motion-presets'
import type { TransitionType } from '@/lib/motion/scene-motion-types'

export type ReelVoiceSegment = {
  text: string
  startSec: number
  endSec: number
  /** Offset into the full voice.mp3 track */
  audioOffsetSec: number
  durationSec: number
}

export type ReelCaptionCue = {
  text: string
  startSec: number
  endSec: number
  words: WordTiming[]
}

export type ReelAnimation = {
  presetId: MotionPresetId
  transition: TransitionType
  motionType?: string
}

/** Single synchronized clip on the reel timeline. */
export type ReelTimelineClip = {
  sceneId: string
  index: number
  duration: number
  startSec: number
  endSec: number
  image: string | null
  /** AI-generated scene clip — preferred over static image when present */
  video?: string | null
  voiceSegment: ReelVoiceSegment
  caption: ReelCaptionCue
  animation: ReelAnimation
  emotion?: string
  title?: string
}

export type ReelTimeline = {
  version: 1
  totalDurationSec: number
  clips: ReelTimelineClip[]
  voiceUrl: string | null
  composedAt: string
}

export type ReelTimelineEditPatch = {
  duration?: number
  captionStartSec?: number
  captionEndSec?: number
  captionText?: string
  presetId?: MotionPresetId
  transition?: TransitionType
  voiceText?: string
}
