import { captionsFromLines } from '@/lib/cinematic/regen-context'
import type { CinematicNiche } from '@/lib/cinematic/niches'
import type { CinematicGenerationOutput } from '@/lib/cinematic/generation'
import { translateScreenplayToFilmPlan } from '@/lib/cinematic/execution/screenplay-video-translator'
import {
  preserveVisualIdentity,
  orchestrateEmotionalRender,
} from '@/lib/cinematic/execution/cinematic-video-pipeline'
import {
  buildCinematicShotPlans,
  buildEmotionalSequenceMap,
} from '@/lib/cinematic/execution/compile/cinematic-shot-plan'
import {
  sequencePacingLabel,
} from '@/lib/cinematic/execution/compile/emotional-sequence-map'
import {
  soundtrackBedForNiche,
  type CinematicFilmBlueprint,
} from '@/lib/cinematic/execution/compile/emotional-film-plan'
import type { CinematicProjectState } from '@/stores/cinematic-project'

export function projectStateToGenerationOutput(
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
  >
): CinematicGenerationOutput {
  const pack = captionsFromLines(state.captionLines)
  return {
    title: state.title || 'Untitled cinematic story',
    hook: state.hook,
    summary: state.summary,
    script: state.script,
    scenes: state.scenes.map((scene) => ({
      id: scene.id,
      title: scene.title || `Scene ${scene.index}`,
      description: scene.narration || scene.title || '',
      duration: scene.duration || 4,
      visualPrompt: scene.visualPrompt || '',
      cameraAngle: scene.cameraAngle || scene.camera || '',
      lightingMood: scene.lightingMood || scene.lighting || '',
      environment: scene.environment || '',
      colorPalette: scene.colorPalette || '',
      movementStyle: scene.movementStyle || '',
    })),
    captions: state.captionLines,
    captionPack: pack,
    suggestedVoiceStyle: state.suggestedVoiceStyle,
    niche: state.niche as CinematicNiche,
  }
}

export function buildCompileFilmPlan(
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
): CinematicFilmBlueprint {
  const output = projectStateToGenerationOutput(state)
  const orchestration = orchestrateEmotionalRender(output)
  const plan = translateScreenplayToFilmPlan(output)
  const shots = buildCinematicShotPlans(plan, state.scenes)
  const sequence = buildEmotionalSequenceMap(plan)
  const visualIdentity = preserveVisualIdentity(output)
  const niche = state.niche as CinematicNiche

  return {
    title: output.title,
    hook: output.hook,
    totalDuration: plan.totalDuration || state.duration,
    voicePacingWpm: plan.voicePacingWpm,
    visualIdentity,
    filmRhythm: `${plan.shots.length} beats · ${plan.totalDuration}s · ${plan.voicePacingWpm} wpm narration`,
    presenceLine: orchestration.ready
      ? 'Your cinematic world is preparing itself naturally.'
      : 'Your story is gathering its final form.',
    narrationRhythm: sequencePacingLabel(sequence),
    soundtrackBed: soundtrackBedForNiche(niche),
    continuityThread: visualIdentity,
    shots,
    sequence,
    ready: orchestration.ready,
  }
}
