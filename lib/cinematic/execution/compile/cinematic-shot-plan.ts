import type { FilmAssemblyPlan } from '@/lib/cinematic/execution/screenplay-video-translator'
import {
  buildSequenceBeat,
  buildShotPlan,
  type CinematicShotPlan,
  type EmotionalSequenceBeat,
} from '@/lib/cinematic/execution/compile/emotional-film-plan'

export function buildCinematicShotPlans(
  plan: FilmAssemblyPlan,
  scenes: Array<{
    colorPalette?: string
    lightingMood?: string
    cameraAngle?: string
  }>
): CinematicShotPlan[] {
  return plan.shots.map((shot, i) =>
    buildShotPlan(shot, scenes[i] ?? {}, plan.shots.length)
  )
}

export function buildEmotionalSequenceMap(
  plan: FilmAssemblyPlan
): EmotionalSequenceBeat[] {
  return plan.shots.map((shot) => buildSequenceBeat(shot, plan.shots.length))
}

export function screenplayMotionMap(
  shots: CinematicShotPlan[]
): string[] {
  return shots.map(
    (s) => `Scene ${s.sceneIndex} (${s.role}): ${s.cameraMotion} → ${s.transition}`
  )
}
