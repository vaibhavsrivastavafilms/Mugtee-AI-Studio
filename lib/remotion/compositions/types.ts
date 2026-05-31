/** @deprecated Legacy motion slug — prefer motionConfig.presetId */
export type ReelSceneMotion = 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right'

import type {
  MotionType,
  ParticleType,
  TransitionType,
} from '@/lib/motion/scene-motion-types'

export type ReelSceneMotionConfig = {
  presetId?: string
  motionType?: MotionType
  scaleFrom: number
  scaleTo: number
  translateXFrom: number
  translateXTo: number
  translateYFrom: number
  translateYTo: number
  rotateFrom?: number
  rotateTo?: number
  parallaxOffset?: number
  depthEnabled?: boolean
  zoomLevel?: number
  particleType?: ParticleType
  transitionType?: TransitionType
  animationIntensity?: number
  flicker?: boolean
  easing?: 'linear' | 'ease-out'
}

export type ReelSceneInput = {
  id: string
  imageSrc: string
  durationSec: number
  caption: string
  /** @deprecated Use motionConfig */
  motion?: ReelSceneMotion
  motionConfig?: ReelSceneMotionConfig
}

export type ReelCompositionProps = {
  title: string
  scenes: ReelSceneInput[]
  voiceAudioSrc: string | null
  musicAudioSrc: string | null
  voiceVolume?: number
  musicVolume?: number
}

export const defaultReelProps: ReelCompositionProps = {
  title: 'Mugtee Reel',
  scenes: [],
  voiceAudioSrc: null,
  musicAudioSrc: null,
  voiceVolume: 1,
  musicVolume: 0.18,
}
