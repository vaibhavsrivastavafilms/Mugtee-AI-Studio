import type { TransitionType } from '@/lib/motion/scene-motion-types'
import { REEL_FPS } from '@/lib/remotion/compositions/constants'

/** 300–500ms transition window at 30fps → 9–15 frames. */
export function transitionFramesForType(type: TransitionType | undefined, sceneIndex: number): number {
  const seed = (sceneIndex * 7 + 11) % 7
  const ms = 300 + seed * 28
  const frames = Math.round((ms / 1000) * REEL_FPS)
  return Math.max(9, Math.min(15, frames))
}

export function transitionUsesOverlap(type: TransitionType | undefined): boolean {
  if (!type || type === 'cut') return false
  return [
    'cross_dissolve',
    'cross_fade',
    'cinematic_dissolve',
    'blur_fade',
    'light_leak',
    'push_transition',
    'film_fade',
    'fade',
  ].includes(type)
}

export function transitionOverlapFrames(type: TransitionType | undefined, sceneIndex: number): number {
  if (!transitionUsesOverlap(type)) return 0
  if (type === 'cross_dissolve' || type === 'cross_fade' || type === 'cinematic_dissolve') {
    return Math.min(15, transitionFramesForType(type, sceneIndex))
  }
  if (type === 'push_transition') return 12
  if (type === 'blur_fade' || type === 'light_leak') return 10
  return 9
}
