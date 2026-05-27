import { buildCompileFilmPlan } from '@/lib/cinematic/execution/compile/compile-film-plan'
import {
  buildCinematicRenderBlueprint,
  blueprintPresenceLine,
} from '@/lib/cinematic/execution/compile/cinematic-render-blueprint'
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
  'Preparing your film for the world',
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
  const blueprint = buildCinematicRenderBlueprint(filmPlan)

  return {
    blueprint,
    presenceLine: blueprintPresenceLine(blueprint),
    exportSteps: COMPILE_EXPORT_STEPS,
  }
}

export { orchestrateEmotionalRender } from '@/lib/cinematic/execution/cinematic-video-pipeline'
