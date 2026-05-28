import {
  buildCompileFilmPlan,
  projectStateToGenerationOutput,
} from '@/lib/cinematic/execution/compile/compile-film-plan'
import {
  buildCinematicRenderBlueprint,
  blueprintPresenceLine,
} from '@/lib/cinematic/execution/compile/cinematic-render-blueprint'
import { buildSceneMotionBlueprint } from '@/lib/cinematic/motion/scene-motion-blueprint'
import type { CinematicProjectState } from '@/stores/cinematic-project'

export type OrchestratedEmotionalRender = {
  blueprint: ReturnType<typeof buildCinematicRenderBlueprint>
  presenceLine: string
  exportSteps: readonly string[]
}

export const COMPILE_EXPORT_STEPS = [
  'Holding your cinematic rhythm',
  'Sequencing emotional beats',
  'Aligning visual continuity',
  'Letting the world become film',
] as const

export function orchestrateEmotionalRenderForCompile(
  state: Pick<
    CinematicProjectState,
    | 'title'
    | 'hook'
    | 'summary'
    | 'script'
    | 'scenes'
    | 'captionLines'
    | 'suggestedVoiceStyle'
    | 'niche'
    | 'duration'
  >
): OrchestratedEmotionalRender {
  const filmPlan = buildCompileFilmPlan(state)
  const baseBlueprint = buildCinematicRenderBlueprint(filmPlan)
  const motion = buildSceneMotionBlueprint(
    projectStateToGenerationOutput(state).scenes
  )
  const blueprint = {
    ...baseBlueprint,
    motionDirections:
      motion.motionDirections.length > 0
        ? motion.motionDirections
        : baseBlueprint.motionDirections,
    transitionRhythm: motion.continuityThread
      ? `${baseBlueprint.transitionRhythm} · ${motion.continuityThread}`
      : baseBlueprint.transitionRhythm,
  }

  return {
    blueprint,
    presenceLine: blueprintPresenceLine(blueprint),
    exportSteps: COMPILE_EXPORT_STEPS,
  }
}

export { orchestrateEmotionalRender } from '@/lib/cinematic/execution/cinematic-video-pipeline'
