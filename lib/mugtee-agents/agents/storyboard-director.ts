/**
 * AGENT 6 — Storyboard Engine → storyboard panels
 */

import type {
  CharacterBibleEntry,
  ProductionScreenplayScene,
  StoryboardPanel,
} from '@/lib/mugtee-agents/types'
import type { EnvironmentBible } from '@/lib/production-os/v4/environment-bible'

const LENSES = ['24mm', '35mm', '50mm', '85mm'] as const
const COMPOSITIONS = [
  'rule of thirds',
  'centered emotional',
  'leading lines',
  'frame within frame',
] as const

/** AGENT 6 */
export function runStoryboardEngine(
  screenplay: ProductionScreenplayScene[],
  characters: CharacterBibleEntry[],
  environment: EnvironmentBible
): StoryboardPanel[] {
  return screenplay.map((scene, i) => {
    const cast = scene.characters.length
      ? scene.characters
      : characters.map((c) => c.name)
    const lead = cast[0] ?? 'Lead'
    const second = cast[1]

    return {
      sceneNumber: scene.sceneNumber,
      camera: scene.cameraDirection,
      lens: LENSES[i % LENSES.length]!,
      composition: COMPOSITIONS[i % COMPOSITIONS.length]!,
      lighting: scene.lighting,
      movement: scene.cameraDirection,
      characters: cast,
      characterPlacement: second
        ? `${lead} foreground mid-frame; ${second} soft background or opposite third`
        : `${lead} hero placement mid-frame, clear silhouette`,
      environment: environment.architecture || environment.worldLock,
      dialogue: scene.dialogue,
      emotion: scene.emotion,
      timingSec: scene.durationSec,
    }
  })
}

/** @deprecated Use runStoryboardEngine */
export const runStoryboardDirector = runStoryboardEngine
