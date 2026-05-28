import type { GeneratedScene } from '@/lib/cinematic/generation'
import { scenePacingRole } from '@/lib/cinematic/regen-context'

export type SceneEmphasis = {
  sceneIndex: number
  label: string
  cue: string
  intensity: number
}

const EMPHASIS_CUES: Record<string, { label: string; cue: string; intensity: number }> = {
  hook: { label: 'Opening pull', cue: 'lean in — first line lands soft then sharp', intensity: 0.75 },
  tension: { label: 'Rising stakes', cue: 'weight on verbs — don\'t rush consonants', intensity: 0.65 },
  peak: { label: 'Emotional crest', cue: 'slow the vowels — hold the ache', intensity: 0.95 },
  release: { label: 'Exhale', cue: 'drop register slightly — room to breathe', intensity: 0.5 },
  aftertaste: { label: 'Lingering line', cue: 'whispered certainty — no announcer energy', intensity: 0.4 },
}

export function buildSceneEmphasisMap(scenes: GeneratedScene[]): SceneEmphasis[] {
  const total = scenes.length || 1
  return scenes.map((scene, i) => {
    const role = scenePacingRole(i + 1, total)
    const base = EMPHASIS_CUES[role] ?? EMPHASIS_CUES.release
    const titleHint = scene.title ? ` — “${scene.title.slice(0, 40)}”` : ''
    return {
      sceneIndex: i,
      label: base.label,
      cue: `${base.cue}${titleHint}`,
      intensity: base.intensity,
    }
  })
}

export function emphasisForSceneIndex(
  scenes: GeneratedScene[],
  sceneIndex: number
): SceneEmphasis | null {
  const map = buildSceneEmphasisMap(scenes)
  return map[sceneIndex] ?? null
}
