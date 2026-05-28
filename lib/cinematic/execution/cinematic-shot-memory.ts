import type { GeneratedScene } from '@/lib/cinematic/generation'
import { scenePacingRole } from '@/lib/cinematic/regen-context'

export type ShotMemoryEntry = {
  sceneIndex: number
  role: string
  cameraAngle: string
  movementStyle: string
  palette: string
}

export function buildShotMemory(scenes: GeneratedScene[]): ShotMemoryEntry[] {
  return scenes.map((scene, i) => {
    const sceneIndex = i + 1
    return {
      sceneIndex,
      role: scenePacingRole(sceneIndex, scenes.length || 1),
      cameraAngle: scene.cameraAngle,
      movementStyle: scene.movementStyle,
      palette: scene.colorPalette,
    }
  })
}

export function nextShotSuggestion(
  memory: ShotMemoryEntry[],
  sceneIndex: number
): string {
  const prior = memory.find((m) => m.sceneIndex === sceneIndex - 1)
  const role = scenePacingRole(sceneIndex, memory.length || 1)
  if (!prior) {
    const openers = [
      'Establish environment with emotional clarity',
      'Open on atmosphere — subject enters frame',
    ]
    return openers[sceneIndex % openers.length]
  }
  if (role === 'peak') {
    const peaks = [
      `Push in from ${prior.cameraAngle} — emotional peak`,
      `Intimate close — crest from ${prior.movementStyle}`,
    ]
    return peaks[sceneIndex % peaks.length]
  }
  if (role === 'aftertaste') return `Release movement; hold on ${prior.palette} tones`
  return `Motivated shift from ${prior.movementStyle}`
}
