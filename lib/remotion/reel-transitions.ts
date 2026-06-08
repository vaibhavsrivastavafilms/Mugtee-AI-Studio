import { interpolate } from 'remotion'
import type { TransitionType } from '@/lib/motion/scene-motion-types'
import { transitionFramesForType } from '@/lib/motion/transition-timing'

export function reelSceneOpacity(
  frame: number,
  durationInFrames: number,
  transitionType: TransitionType | undefined,
  sceneIndex: number,
  options?: { skipEntryFade?: boolean }
): number {
  const fadeLen = transitionFramesForType(transitionType, sceneIndex)

  const fadeIn = options?.skipEntryFade
    ? 1
    : interpolate(frame, [0, fadeLen], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })

  const fadeOut = interpolate(
    frame,
    [durationInFrames - fadeLen, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  let opacity = Math.min(fadeIn, fadeOut)

  if (transitionType === 'blur_fade') {
    opacity = Math.pow(opacity, 1.15)
  }
  if (transitionType === 'light_leak') {
    const leak = interpolate(frame, [0, fadeLen], [0.15, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
    opacity = Math.min(1, opacity + leak)
  }

  return opacity
}

export function reelSceneTransformExtras(
  frame: number,
  durationInFrames: number,
  transitionType: TransitionType | undefined,
  sceneIndex: number
): { pushX: number; blurPx: number; leakOpacity: number } {
  const fadeLen = transitionFramesForType(transitionType, sceneIndex)
  const pushX =
    transitionType === 'push_transition'
      ? interpolate(frame, [0, fadeLen], [48, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0

  const blurPx =
    transitionType === 'blur_fade'
      ? interpolate(frame, [0, fadeLen], [8, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0

  const leakOpacity =
    transitionType === 'light_leak'
      ? interpolate(frame, [0, fadeLen], [0.35, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0

  return { pushX, blurPx, leakOpacity }
}
