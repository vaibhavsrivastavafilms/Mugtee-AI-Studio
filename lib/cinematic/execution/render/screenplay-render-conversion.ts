import type { CinematicRenderBlueprint } from '@/lib/cinematic/execution/compile/cinematic-render-blueprint'
import {
  buildCinematicRenderIntent,
  type CinematicRenderIntent,
} from '@/lib/cinematic/execution/render/cinematic-render-intent'
import { motionAtmosphereHint } from '@/lib/cinematic/execution/render/emotional-motion-translation'

export type ScreenplayRenderInstructions = {
  intent: CinematicRenderIntent
  shotHints: string[]
  pacingNote: string
}

export function convertScreenplayToRenderInstructions(
  blueprint: CinematicRenderBlueprint
): ScreenplayRenderInstructions {
  const intent = buildCinematicRenderIntent(blueprint)
  return {
    intent,
    shotHints: intent.shots.map((s) => motionAtmosphereHint(s)),
    pacingNote: blueprint.narrationRhythm,
  }
}
