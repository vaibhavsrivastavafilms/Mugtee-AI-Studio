export { buildCinematicVideoPipeline } from '@/lib/cinematic/execution/screenplay-video-translator'
export { translateScreenplayToFilmPlan } from '@/lib/cinematic/execution/screenplay-video-translator'

export type SceneMotion = {
  type: 'static' | 'push-in' | 'drift' | 'pull-back'
  intensity: 'subtle' | 'moderate'
  durationMs: number
}

export function motionForScene(role: string, durationSec: number): SceneMotion {
  const durationMs = durationSec * 1000
  if (role === 'hook') {
    return { type: 'push-in', intensity: 'subtle', durationMs }
  }
  if (role === 'tension') {
    return { type: 'drift', intensity: 'subtle', durationMs }
  }
  if (role === 'peak') {
    return { type: 'push-in', intensity: 'moderate', durationMs }
  }
  if (role === 'aftertaste') {
    return { type: 'static', intensity: 'subtle', durationMs }
  }
  return { type: 'pull-back', intensity: 'subtle', durationMs }
}

export function emotionalCameraMotion(role: string): string {
  const m = motionForScene(role, 4)
  return `${m.type} · ${m.intensity} · ${Math.round(m.durationMs / 1000)}s`
}

export function cinematicTransitionHint(
  fromRole: string,
  toRole: string
): 'cut' | 'dissolve' | 'hold' {
  if (toRole === 'aftertaste') return 'hold'
  if (fromRole === 'peak' || toRole === 'peak') return 'dissolve'
  return 'cut'
}

export function visualRhythmMotion(sceneIndex: number, total: number): number {
  return 0.85 + (sceneIndex / Math.max(total, 1)) * 0.15
}
