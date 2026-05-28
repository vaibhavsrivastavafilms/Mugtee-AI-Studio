import type { GeneratedScene } from '@/lib/cinematic/generation'
import { sceneArcRole } from '@/lib/cinematic/regen-context'

export type SceneWeight = {
  index: number
  role: string
  weight: number
  durationBias: number
  visualPriority: 'ambient' | 'motivated' | 'dominant'
}

export function cinematicSceneWeight(
  sceneIndex: number,
  totalScenes: number
): SceneWeight {
  const role = sceneArcRole(sceneIndex, totalScenes || 1)
  const weight =
    role === 'peak' ? 1 : role === 'hook' ? 0.85 : role === 'tension' ? 0.7 : role === 'aftertaste' ? 0.55 : 0.6
  const durationBias =
    role === 'peak' ? 1.12 : role === 'hook' ? 0.92 : role === 'aftertaste' ? 1.08 : 1
  const visualPriority: SceneWeight['visualPriority'] =
    role === 'peak' ? 'dominant' : role === 'hook' || role === 'tension' ? 'motivated' : 'ambient'

  return { index: sceneIndex, role, weight, durationBias, visualPriority }
}

export function rankScenesByWeight(scenes: GeneratedScene[]): SceneWeight[] {
  const total = scenes.length || 1
  return scenes.map((_, i) => cinematicSceneWeight(i + 1, total))
}

export function dominantSceneIndex(scenes: GeneratedScene[]): number {
  const weights = rankScenesByWeight(scenes)
  let best = 0
  let bestWeight = 0
  weights.forEach((w, i) => {
    if (w.weight > bestWeight) {
      bestWeight = w.weight
      best = i
    }
  })
  return best
}
