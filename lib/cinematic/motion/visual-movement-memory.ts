import type { GeneratedScene } from '@/lib/cinematic/generation'

export type VisualMovementMemory = {
  priorMotifs: string[]
  continuityThread: string
  restrainedProgression: boolean
}

export function buildVisualMovementMemory(
  scenes: GeneratedScene[],
  upToIndex: number
): VisualMovementMemory {
  const slice = scenes.slice(0, Math.max(0, upToIndex + 1))
  const priorMotifs = slice
    .map((s) => s.movementStyle || s.cameraAngle)
    .filter(Boolean)
    .slice(-4)

  const palettes = slice.map((s) => s.colorPalette).filter(Boolean)
  const continuityThread =
    palettes.length >= 2
      ? `${palettes[0]} → ${palettes[palettes.length - 1]}`
      : palettes[0] || 'visual thread held in restraint'

  return {
    priorMotifs,
    continuityThread,
    restrainedProgression: slice.length <= 3,
  }
}

export function movementHintForScene(
  scenes: GeneratedScene[],
  sceneIndex: number
): string {
  const memory = buildVisualMovementMemory(scenes, sceneIndex)
  const motif = memory.priorMotifs[memory.priorMotifs.length - 1]
  return motif
    ? `Continues ${motif} — ${memory.continuityThread}`
    : memory.continuityThread
}
