import type { GeneratedScene } from '@/lib/cinematic/generation'
import { scenePacingRole } from '@/lib/cinematic/regen-context'

export type MotionSequenceStep = {
  sceneIndex: number
  role: string
  motionType: string
  intensity: 'subtle' | 'motivated' | 'held'
  transitionOut: 'cut' | 'dissolve' | 'hold'
}

export function buildMotionSequence(scenes: GeneratedScene[]): MotionSequenceStep[] {
  const total = scenes.length || 1
  return scenes.map((scene, i) => {
    const role = scenePacingRole(i + 1, total)
    const motionType = scene.movementStyle || scene.cameraAngle || 'motivated drift'
    const intensity: MotionSequenceStep['intensity'] =
      role === 'peak' ? 'held' : role === 'tension' ? 'motivated' : 'subtle'
    const transitionOut: MotionSequenceStep['transitionOut'] =
      role === 'peak' ? 'dissolve' : role === 'aftertaste' ? 'hold' : 'cut'

    return {
      sceneIndex: i,
      role,
      motionType,
      intensity,
      transitionOut,
    }
  })
}

export function motionDirectionsFromScenes(scenes: GeneratedScene[]): string[] {
  return buildMotionSequence(scenes).map(
    (step) => `${step.motionType} · ${step.intensity}`
  )
}
