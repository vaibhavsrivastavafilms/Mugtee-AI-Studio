import type { MotionPresetId, RemotionMotionConfig, SceneMotionSource } from '@/lib/motion/motion-presets'

export type MotionType =
  | 'push_in'
  | 'pull_out'
  | 'pan_left'
  | 'pan_right'
  | 'slow_orbit'
  | 'tracking'
  | 'parallax'
  | 'static_drift'

export type ParticleType = 'none' | 'dust' | 'fog' | 'light_rays'

export type TransitionType = 'fade' | 'cross_dissolve' | 'cut'

/** Per-scene cinematic motion assignment (stored in cinematic_projects.scene_motion). */
export type SceneMotion = {
  presetId: MotionPresetId
  motionType?: MotionType
  /** Scene hold duration override (seconds) — export may still clamp to voice. */
  duration?: number
  /** 0–1 zoom emphasis multiplier applied on top of preset scale range. */
  zoomLevel?: number
  particleType?: ParticleType
  transitionType?: TransitionType
  depthEnabled?: boolean
  /** 0–100 subtle breathing / flicker intensity (default 20). */
  animationIntensity?: number
  params?: Partial<RemotionMotionConfig>
  source?: SceneMotionSource
}

export type SceneMotionMap = Record<string, SceneMotion>

export const DEFAULT_ANIMATION_INTENSITY = 20

export function normalizeAnimationIntensity(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return DEFAULT_ANIMATION_INTENSITY
  return Math.max(0, Math.min(100, Math.round(n)))
}
