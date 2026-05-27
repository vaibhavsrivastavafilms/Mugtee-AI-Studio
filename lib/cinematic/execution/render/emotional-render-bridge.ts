import type { CinematicRenderBlueprint } from '@/lib/cinematic/execution/compile/cinematic-render-blueprint'
import { buildCinematicRenderIntent } from '@/lib/cinematic/execution/render/cinematic-render-intent'
import { convertScreenplayToRenderInstructions } from '@/lib/cinematic/execution/render/screenplay-render-conversion'
import { orchestrateRender } from '@/lib/cinematic/execution/render/render-orchestration-engine'

export async function bridgeEmotionalRender(
  blueprint: CinematicRenderBlueprint
) {
  const instructions = convertScreenplayToRenderInstructions(blueprint)
  const intent = buildCinematicRenderIntent(blueprint)
  const result = await orchestrateRender(blueprint)
  return {
    result,
    intent,
    shotCount: instructions.intent.shots.length,
  }
}
