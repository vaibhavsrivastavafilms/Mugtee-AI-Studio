import type { CinematicGenerationOutput } from '@/lib/cinematic/generation'
import { translateScreenplayToFilmPlan } from '@/lib/cinematic/execution/screenplay-video-translator'

export type RenderOrchestration = {
  plan: ReturnType<typeof translateScreenplayToFilmPlan>
  ready: boolean
  missing: string[]
}

/** Prepare film generation metadata without exposing render infrastructure. */
export function orchestrateEmotionalRender(
  output: CinematicGenerationOutput
): RenderOrchestration {
  const plan = translateScreenplayToFilmPlan(output)
  const missing: string[] = []
  if (!output.hook.trim()) missing.push('hook')
  if (plan.shots.length < 2) missing.push('scenes')
  if (plan.shots.some((s) => !s.visualPrompt.trim())) missing.push('visual_prompts')

  return {
    plan,
    ready: missing.length === 0,
    missing,
  }
}

export function preserveVisualIdentity(output: CinematicGenerationOutput): string {
  const palettes = [...new Set(output.scenes.map((s) => s.colorPalette).filter(Boolean))]
  return palettes.slice(0, 2).join(' · ') || 'cinematic restrained palette'
}

export function cinematicFilmRhythm(output: CinematicGenerationOutput): string {
  const plan = translateScreenplayToFilmPlan(output)
  return `${plan.shots.length} beats · ${plan.totalDuration}s · ${plan.voicePacingWpm} wpm voice target`
}
