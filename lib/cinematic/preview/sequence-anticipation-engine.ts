import type { GeneratedScene } from '@/lib/cinematic/generation'
import { scenePacingRole } from '@/lib/cinematic/regen-context'

export type SequenceAnticipation = {
  intervalsMs: number[]
  presenceLine: string
  continuityHint: string
  restrainedProgression: boolean
}

const PRESENCE_LINES = [
  'Each beat arrives with held breath',
  'Scenes gather before the lens',
  'Rhythm builds toward the frame',
  'Your story holds its cinematic pulse',
  'Anticipation threads through the sequence',
] as const

function intervalForRole(role: string, durationSec: number, index: number, total: number): number {
  const base = durationSec * 1000
  const longForm = total >= 10
  const wave = longForm ? 1 + Math.sin((index / total) * Math.PI * 2) * 0.05 : 1
  const breathBeat = longForm && index > 0 && index % 5 === 0 ? 1.08 : 1

  if (role === 'hook' || index === 0) return Math.max(1600, Math.round(base * 0.82 * wave))
  if (role === 'peak') return Math.max(2100, Math.round(base * 1.06 * wave))
  if (role === 'aftertaste' || index === total - 1) {
    return Math.max(2300, Math.round(base * 1.14 * breathBeat))
  }
  if (role === 'tension') return Math.max(1900, Math.round(base * 0.98 * wave))
  return Math.max(1800, Math.round(base * wave))
}

export function buildSequenceAnticipation(
  scenes: GeneratedScene[],
  totalDuration: number
): SequenceAnticipation {
  const total = Math.max(scenes.length, 1)
  const perScene = totalDuration / total

  const intervalsMs = scenes.length
    ? scenes.map((scene, i) => {
        const role = scenePacingRole(i + 1, total)
        return intervalForRole(role, scene.duration || perScene, i, total)
      })
    : [Math.max(2000, totalDuration * 200)]

  const continuityHint =
    scenes.length >= 2
      ? `${scenes[0].colorPalette || 'visual thread'} carries through ${total} beats`
      : 'Opening atmosphere held in restraint'

  return {
    intervalsMs,
    presenceLine: PRESENCE_LINES[total % PRESENCE_LINES.length],
    continuityHint,
    restrainedProgression: total <= 4,
  }
}
