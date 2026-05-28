import type { CinematicRenderBlueprint } from '@/lib/cinematic/execution/compile/cinematic-render-blueprint'
import type { PreviewRhythmMetadata } from '@/lib/cinematic/render/preview-rhythm'
import { emotionalTransitionMotion } from '@/lib/cinematic/motion/emotional-transition-motion'

export type MotionInterpolationStep = {
  sceneIndex: number
  interpolation: 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear'
  softness: number
  pacingModulation: number
  motionCue: string
}

export type MotionRealizationProfile = {
  steps: MotionInterpolationStep[]
  averageSoftness: number
  pacingModulation: number
  continuityThread: string
}

function interpolationForWeight(
  weight: string | undefined
): MotionInterpolationStep['interpolation'] {
  if (weight === 'open') return 'ease-in'
  if (weight === 'peak') return 'ease-in-out'
  if (weight === 'hold') return 'ease-out'
  if (weight === 'release') return 'ease-out'
  return 'linear'
}

function softnessForTransition(fromIndex: number, toIndex: number, total: number): number {
  const transition = emotionalTransitionMotion(fromIndex, toIndex, total)
  const fadeNorm = transition.fadeMs / 560
  return Math.min(1, Math.max(0.2, fadeNorm))
}

export function buildMotionRealizationProfile(
  blueprint: CinematicRenderBlueprint,
  rhythm: PreviewRhythmMetadata
): MotionRealizationProfile {
  const total = blueprint.shots.length || 1
  const longForm = total >= 10

  const steps: MotionInterpolationStep[] = blueprint.shots.map((shot, i) => {
    const weight = blueprint.sequence[i]?.emotionalWeight
    const nextIdx = Math.min(i + 2, total)
    const softness = softnessForTransition(i + 1, nextIdx, total)
    const waveMod = longForm ? 1 + Math.sin((i / total) * Math.PI) * 0.06 : 1

    return {
      sceneIndex: shot.sceneIndex,
      interpolation: interpolationForWeight(weight),
      softness,
      pacingModulation: Math.round(waveMod * 100) / 100,
      motionCue: rhythm.movementSequencing[i] ?? blueprint.motionDirections[i] ?? shot.cameraMotion,
    }
  })

  const averageSoftness =
    steps.reduce((sum, s) => sum + s.softness, 0) / Math.max(steps.length, 1)
  const pacingModulation =
    steps.reduce((sum, s) => sum + s.pacingModulation, 0) / Math.max(steps.length, 1)

  return {
    steps,
    averageSoftness: Math.round(averageSoftness * 100) / 100,
    pacingModulation: Math.round(pacingModulation * 100) / 100,
    continuityThread: blueprint.continuityThread,
  }
}
