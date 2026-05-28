import type { GeneratedScene } from '@/lib/cinematic/generation'
import { scenePacingRole } from '@/lib/cinematic/regen-context'

export type EscalationPreview = {
  phase: 'opening' | 'rising' | 'peak' | 'settling'
  currentBeat: string
  escalationLine: string
  continuityMemory: string[]
}

const PHASE_LINES: Record<EscalationPreview['phase'], string> = {
  opening: 'The world opens — hook held in stillness',
  rising: 'Tension gathers — each beat closer to the frame',
  peak: 'Emotional crest — the story holds its breath',
  settling: 'Aftertaste — rhythm settles into memory',
}

export function buildEscalationPreview(scenes: GeneratedScene[]): EscalationPreview {
  const total = scenes.length
  if (total === 0) {
    return {
      phase: 'opening',
      currentBeat: 'Anticipation before the first frame',
      escalationLine: PHASE_LINES.opening,
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
    escalationLine: PHASE_LINES[phase],
    continuityMemory,
  }
}

export function escalationPresenceForIndex(
  index: number,
  total: number
): string {
  const role = scenePacingRole(index + 1, total)
  if (role === 'hook') return 'Opening anticipation'
  if (role === 'tension') return 'Rhythm rising'
  if (role === 'peak') return 'Emotional crest'
  if (role === 'aftertaste') return 'Held aftertaste'
  return 'Breathing between beats'
}
