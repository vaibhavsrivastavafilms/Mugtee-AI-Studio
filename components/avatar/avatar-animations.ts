import type { MugteeAvatarState } from '@/components/avatar/types'

export type AvatarAnimationParams = {
  breatheSpeed: number
  breatheAmp: number
  headSway: number
  headSwaySpeed: number
  headTilt: number
  eyeIntensity: number
  eyePulse: number
  bounce: number
  leanZ: number
  shake: number
}

const DEFAULTS: AvatarAnimationParams = {
  breatheSpeed: 1.6,
  breatheAmp: 0.025,
  headSway: 0.45,
  headSwaySpeed: 0.35,
  headTilt: 0,
  eyeIntensity: 1.4,
  eyePulse: 0,
  bounce: 0,
  leanZ: 0,
  shake: 0,
}

export const AVATAR_ANIMATION_BY_STATE: Record<MugteeAvatarState, AvatarAnimationParams> = {
  idle: {
    ...DEFAULTS,
  },
  listening: {
    ...DEFAULTS,
    breatheSpeed: 1.2,
    headSway: 0.2,
    headSwaySpeed: 0.25,
    leanZ: 0.08,
    eyeIntensity: 1.8,
    eyePulse: 0.35,
  },
  thinking: {
    ...DEFAULTS,
    breatheSpeed: 0.9,
    breatheAmp: 0.015,
    headSway: 0.12,
    headSwaySpeed: 0.18,
    headTilt: 0.18,
    eyeIntensity: 0.9,
    eyePulse: 0.5,
  },
  speaking: {
    ...DEFAULTS,
    breatheSpeed: 2.2,
    breatheAmp: 0.04,
    headSway: 0.3,
    headSwaySpeed: 0.5,
    eyeIntensity: 1.6,
    eyePulse: 0.6,
    bounce: 0.015,
  },
  happy: {
    ...DEFAULTS,
    breatheSpeed: 2,
    breatheAmp: 0.035,
    headSway: 0.55,
    headSwaySpeed: 0.6,
    eyeIntensity: 1.9,
    bounce: 0.025,
  },
  celebrating: {
    ...DEFAULTS,
    breatheSpeed: 2.8,
    breatheAmp: 0.06,
    headSway: 0.7,
    headSwaySpeed: 0.9,
    eyeIntensity: 2.2,
    bounce: 0.05,
  },
  warning: {
    ...DEFAULTS,
    breatheSpeed: 1.4,
    headSway: 0.08,
    headSwaySpeed: 0.5,
    eyeIntensity: 1.1,
    shake: 0.012,
  },
}

export function lerpAnimationParams(
  from: AvatarAnimationParams,
  to: AvatarAnimationParams,
  t: number
): AvatarAnimationParams {
  const lerp = (a: number, b: number) => a + (b - a) * t
  return {
    breatheSpeed: lerp(from.breatheSpeed, to.breatheSpeed),
    breatheAmp: lerp(from.breatheAmp, to.breatheAmp),
    headSway: lerp(from.headSway, to.headSway),
    headSwaySpeed: lerp(from.headSwaySpeed, to.headSwaySpeed),
    headTilt: lerp(from.headTilt, to.headTilt),
    eyeIntensity: lerp(from.eyeIntensity, to.eyeIntensity),
    eyePulse: lerp(from.eyePulse, to.eyePulse),
    bounce: lerp(from.bounce, to.bounce),
    leanZ: lerp(from.leanZ, to.leanZ),
    shake: lerp(from.shake, to.shake),
  }
}
