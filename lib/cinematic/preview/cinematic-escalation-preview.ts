import type { GeneratedScene } from '@/lib/cinematic/generation'
import { scenePacingRole } from '@/lib/cinematic/regen-context'

export type EscalationPreview = {
  phase: 'opening' | 'rising' | 'peak' | 'settling'
  currentBeat: string
  escalationLine: string
  continuityMemory: string[]
}

const PHASE_LINES: Record<EscalationPreview['phase'], string[]> = {
  opening: [
    'The world opens — hook held in stillness',
    'First breath before the frame arrives',
  ],
  rising: [
    'Tension gathers — each beat closer to the frame',
    'Rhythm lifts — the story leans forward',
  ],
  peak: [
    'Emotional crest — the story holds its breath',
    'The crest — intimacy before release',
  ],
  settling: [
    'Aftertaste — rhythm settles into memory',
    'Exhale — what lingers after the cut',
  ],
}

export function buildEscalationPreview(scenes: GeneratedScene[]): EscalationPreview {
  const total = scenes.length
  if (total === 0) {
    return {
      phase: 'opening',
      currentBeat: 'Anticipation before the first frame',
      escalationLine: PHASE_LINES.opening[0],
      continuityMemory: [],
    }
  }

  const roles = scenes.map((_, i) => scenePacingRole(i + 1, total))
  const hasPeak = roles.includes('peak')
  const phase: EscalationPreview['phase'] = hasPeak
    ? roles[roles.length - 1] === 'aftertaste'
      ? 'settling'
      : 'peak'
    : roles[0] === 'hook'
      ? 'opening'
      : 'rising'

  const peakIndex = roles.indexOf('peak')
  const currentBeat =
    peakIndex >= 0
      ? scenes[peakIndex]?.title || `Beat ${peakIndex + 1}`
      : scenes[0]?.title || 'Opening beat'

  const continuityMemory = scenes
    .slice(0, 3)
    .map((s) => s.colorPalette || s.lightingMood)
    .filter(Boolean)

  return {
    phase,
    currentBeat,
    escalationLine: PHASE_LINES[phase][total % PHASE_LINES[phase].length],
    continuityMemory,
  }
}

export function escalationPresenceForIndex(
  index: number,
  total: number
): string {
  const role = scenePacingRole(index + 1, total)
  const labels: Record<string, string[]> = {
    hook: ['Opening anticipation', 'First breath held'],
    tension: ['Rhythm rising', 'Tension gathering'],
    peak: ['Emotional crest', 'Breath held at crest'],
    aftertaste: ['Held aftertaste', 'Memory after the cut'],
  }
  const pool = labels[role] ?? ['Breathing between beats', 'Restrained cadence']
  return pool[index % pool.length]
}
