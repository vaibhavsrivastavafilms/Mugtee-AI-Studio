import type { CinematicFilmBlueprint } from '@/lib/cinematic/execution/compile/emotional-film-plan'
import { screenplayMotionMap } from '@/lib/cinematic/execution/compile/cinematic-shot-plan'

export type CinematicRenderBlueprint = CinematicFilmBlueprint & {
  motionDirections: string[]
  transitionRhythm: string
  voiceTiming: string
}

export function buildCinematicRenderBlueprint(
  plan: CinematicFilmBlueprint
): CinematicRenderBlueprint {
  const motionDirections = screenplayMotionMap(plan.shots)
  const transitions = plan.shots.map((s) => s.transition)
  const dissolveCount = transitions.filter((t) => t === 'dissolve').length
  const holdCount = transitions.filter((t) => t === 'hold').length

  return {
    ...plan,
    motionDirections,
    transitionRhythm:
      dissolveCount > 0 || holdCount > 0
        ? `Restrained cuts with ${dissolveCount} soft dissolves · ${holdCount} held endings`
        : 'Motivated cuts · cinematic restraint',
    voiceTiming: `${plan.voicePacingWpm} wpm · ${plan.narrationRhythm}`,
  }
}

export function blueprintPresenceLine(blueprint: CinematicRenderBlueprint): string {
  return blueprint.ready
    ? 'Sequence aligned · emotional pacing held'
    : 'Gathering beats · atmosphere preserved'
}
