/**
 * AGENT 3 — Screenplay Engine → Production Screenplay
 */

import type {
  CreativeBrief,
  ProductionScreenplayScene,
  StoryEngineOutput,
} from '@/lib/mugtee-agents/types'

const CAMERA = [
  'Wide establishing — slow push in',
  'Medium — gentle track with subject',
  'Close-up — emotional hold',
  'Over-shoulder — relational warmth',
  'Low angle — rising hope',
  'Soft orbit — revelation',
] as const

const LIGHT = [
  'Golden hour soft key',
  'Warm practicals in earthen interiors',
  'Temple glow — sacred warm ambience',
  'Diffused daylight, soft shadows',
  'Magic-hour rim light',
] as const

const TIME = ['dawn', 'morning', 'afternoon', 'golden hour', 'evening'] as const

const TRANSITIONS = [
  'cross dissolve',
  'match cut',
  'fade through light',
  'soft cut',
] as const

/** AGENT 3 */
export function runScreenplayEngine(
  brief: CreativeBrief,
  story: StoryEngineOutput
): ProductionScreenplayScene[] {
  // Main characters drive on-screen presence; supporting stay narrative-only
  const chars = brief.mainCharacters.length
    ? brief.mainCharacters
    : ['Protagonist']

  return story.sceneList.map((scene, i) => {
    const t = i / Math.max(1, story.sceneList.length - 1)
    const emotion =
      t < 0.2
        ? 'quiet wonder'
        : t < 0.65
          ? brief.emotion
          : t < 0.88
            ? 'peak emotion'
            : 'warm resolution'

    return {
      sceneNumber: scene.sceneNumber,
      location: brief.setting,
      time: TIME[i % TIME.length]!,
      characters: chars,
      action: scene.summary,
      dialogue: scene.dialogue,
      emotion,
      cameraDirection: CAMERA[i % CAMERA.length]!,
      lighting: LIGHT[i % LIGHT.length]!,
      durationSec: scene.durationSec,
      transition: i === 0 ? 'cut' : TRANSITIONS[i % TRANSITIONS.length]!,
    }
  })
}
