/**
 * AGENT 5 — Environment Director → Environment Bible
 */

import {
  buildEnvironmentBible,
  type EnvironmentBible,
} from '@/lib/production-os/v4/environment-bible'
import type { CreativeBrief } from '@/lib/mugtee-agents/types'

/** AGENT 5 */
export function runEnvironmentDirector(brief: CreativeBrief): EnvironmentBible {
  const timeOfDay = /\bjagannath|puri|temple/i.test(brief.setting + brief.idea)
    ? 'golden hour into soft dusk lamps'
    : 'consistent story-daylight with warm practicals'

  return buildEnvironmentBible({
    environmentHint: [
      brief.setting,
      `Time of day locked: ${timeOfDay}.`,
      `Architecture, props, textures, weather, objects locked for: ${brief.theme}`,
      'Pixar-inspired stylised 3D world — cohesive, family-friendly, child-safe.',
      'No horror, gore, or unsafe imagery.',
      `Mood: ${brief.emotion}. Genre: ${brief.genre}. Colour palette consistent across every scene.`,
    ].join(' '),
    style: `${brief.genre}, pixar_stylised_3d`,
  })
}
