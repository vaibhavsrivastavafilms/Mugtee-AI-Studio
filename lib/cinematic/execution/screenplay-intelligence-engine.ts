import type { CinematicNiche } from '@/lib/cinematic/niches'
import type { CinematicGenerationOutput } from '@/lib/cinematic/generation'
import { sceneArcRole } from '@/lib/cinematic/regen-context'
import {
  analyzeCinematicRhythm,
  correctLongFormRhythm,
  formatDirectedScript,
  rebalanceSceneDurations,
} from '@/lib/cinematic/execution/cinematic-rhythm-analysis'
import {
  applyEmotionalEscalation,
  scoreEmotionalArc,
} from '@/lib/cinematic/execution/emotional-escalation-system'
import { formatFinalHook } from '@/lib/cinematic/hook-format'
import { selectCinematicHook } from '@/lib/cinematic/execution/cinematic-hook-engine'
import { alignOpeningSceneWithHook } from '@/lib/cinematic/execution/visual-hook-architecture'
import { enhanceStoryboardScenes } from '@/lib/cinematic/execution/cinematic-storyboard-engine'
import { planCameraDirection } from '@/lib/cinematic/execution/cinematic-camera-engine'
import {
  applyCalibratedDurations,
  calibrateVisualRhythm,
} from '@/lib/cinematic/storyboard/visual-rhythm-calibration'

export type ScreenplayEnhanceContext = {
  topic: string
  duration: number
  tone?: string
  niche: CinematicNiche
  hookVariations?: string[]
}

/**
 * Post-process model output for film-grade pacing, hooks, and directed formatting.
 * Runs after normalize — invisible to the creator.
 */
export function enhanceScreenplayOutput(
  output: CinematicGenerationOutput,
  context: ScreenplayEnhanceContext
): CinematicGenerationOutput {
  const hook = formatFinalHook(
    selectCinematicHook(
      context.hookVariations ?? [],
      context.niche,
      output.hook
    )
  )

  let scenes = applyEmotionalEscalation(output.scenes, context.niche)
  scenes = alignOpeningSceneWithHook(scenes, hook)
  scenes = enhanceStoryboardScenes(scenes, context.niche)
  const rhythmCalibration = calibrateVisualRhythm(scenes, context.duration)
  scenes = applyCalibratedDurations(scenes, rhythmCalibration)
  if (scenes.length >= 10 && rhythmCalibration.longFormAdjusted) {
    scenes = correctLongFormRhythm(scenes, context.duration)
  }
  scenes = scenes.map((scene, i) => {
    if (scene.cameraAngle.trim()) return scene
    const role = sceneArcRole(i + 1, scenes.length || 1)
    return { ...scene, cameraAngle: planCameraDirection(role, i + 1) }
  })

  const roles = scenes.map((_, i) =>
    sceneArcRole(i + 1, scenes.length || 1)
  )
  const rhythm = analyzeCinematicRhythm(scenes, context.duration, roles)

  if (
    rhythm.issues.includes('duration_drift') ||
    rhythm.issues.includes('flat_middle') ||
    rhythm.issues.includes('rhythm_collapse')
  ) {
    scenes = rebalanceSceneDurations(scenes, context.duration, roles)
  }

  const directedScript =
    output.script.trim().length > 80
      ? output.script
      : formatDirectedScript(
          hook,
          scenes.map((s) => ({ title: s.title, description: s.description }))
        )

  const arcScore = scoreEmotionalArc(scenes)
  const summary =
    output.summary ||
    `A ${context.duration}s directed reel — ${context.topic.slice(0, 90)}.`

  return {
    ...output,
    hook,
    scenes,
    script: directedScript,
    summary:
      arcScore >= 0.4
        ? summary
        : `${summary.replace(/\.\s*$/, '')} — ${scenes.length} beats held in arc.`,
    niche: context.niche,
  }
}

export function buildScreenplayIntelligenceNote(context: ScreenplayEnhanceContext): string {
  return [
    'Direct emotionally — avoid generic creator or viral language.',
    `Target ${context.duration}s vertical film with cinematic beat spacing.`,
    `Niche: ${context.niche}. Hook must feel narratively irresistible, not algorithmic.`,
  ].join(' ')
}
