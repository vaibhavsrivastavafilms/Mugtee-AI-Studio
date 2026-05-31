import { interpolate } from 'remotion'
import { DEFAULT_ANIMATION_INTENSITY, normalizeAnimationIntensity } from '@/lib/motion/scene-motion-types'

export type MicroAnimationValues = {
  opacityMultiplier: number
  scaleMultiplier: number
  flickerOpacity: number
}

/** Subtle breathing pulse — intensity 0–100, default 20. */
export function microAnimationAtFrame(
  frame: number,
  fps: number,
  intensity: number,
  options?: { flicker?: boolean }
): MicroAnimationValues {
  const level = normalizeAnimationIntensity(intensity) / 100
  const t = frame / Math.max(1, fps)
  const breath = Math.sin(t * Math.PI * 0.45) * 0.012 * level
  const opacityMultiplier = 1 + breath * 0.6
  const scaleMultiplier = 1 + breath

  let flickerOpacity = 0
  if (options?.flicker && level > 0.08) {
    flickerOpacity = interpolate(
      Math.sin(t * 9.5) + Math.sin(t * 14.2),
      [-2, 2],
      [0, 0.14 * level],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    )
  }

  return { opacityMultiplier, scaleMultiplier, flickerOpacity }
}

export { DEFAULT_ANIMATION_INTENSITY }
