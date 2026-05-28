import type { GeneratedScene } from '@/lib/cinematic/generation'
import { sceneArcRole } from '@/lib/cinematic/regen-context'

export type EscalationPreview = {
  phase: 'opening' | 'rising' | 'peak' | 'settling'
  currentBeat: string
  escalationLine: string
  continuityMemory: string[]
  actSegment: string
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

const LONG_FORM_PHASE_LINES: Record<EscalationPreview['phase'], string[]> = {
  opening: ['Act I — world establishes before momentum', 'Opening atmosphere — restraint before lift'],
  rising: ['Mid-arc lift — variation prevents flattening', 'Rhythm breathes between escalation waves'],
  peak: ['Primary crest — intimacy held across the arc', 'Emotional summit — breath before descent'],
  settling: ['Denouement — atmosphere endures beyond the cut', 'Final breath — memory after the sequence'],
}

function resolvePhase(roles: string[], total: number): EscalationPreview['phase'] {
  const hasPeak = roles.includes('peak')
  if (!hasPeak) {
    return roles[0] === 'hook' ? 'opening' : 'rising'
  }
  const peakIdx = roles.indexOf('peak')
  const lastRole = roles[roles.length - 1]
  if (lastRole === 'aftertaste' || lastRole === 'release') return 'settling'
  if (total >= 10) {
    const progress = peakIdx / Math.max(total - 1, 1)
    if (progress <= 0.2) return 'opening'
    if (progress >= 0.75) return 'settling'
    return peakIdx >= total * 0.6 ? 'peak' : 'rising'
  }
  return roles[roles.length - 1] === 'aftertaste' ? 'settling' : 'peak'
}

function actSegmentLabel(index: number, total: number): string {
  if (total < 10) return ''
  const progress = index / Math.max(total - 1, 1)
  if (progress <= 0.25) return 'Act I'
  if (progress <= 0.55) return 'Act II'
  if (progress <= 0.82) return 'Act III'
  return 'Coda'
}

export function buildEscalationPreview(scenes: GeneratedScene[]): EscalationPreview {
  const total = scenes.length
  if (total === 0) {
    return {
      phase: 'opening',
      currentBeat: 'Anticipation before the first frame',
      escalationLine: PHASE_LINES.opening[0],
      continuityMemory: [],
      actSegment: '',
    }
  }

  const roles = scenes.map((_, i) => sceneArcRole(i + 1, total))
  const phase = resolvePhase(roles, total)
  const linePool = total >= 10 ? LONG_FORM_PHASE_LINES : PHASE_LINES

  const peakIndex = roles.indexOf('peak')
  const currentBeat =
    peakIndex >= 0
      ? scenes[peakIndex]?.title || `Beat ${peakIndex + 1}`
      : scenes[Math.min(2, total - 1)]?.title || 'Opening beat'

  const memoryDepth = total >= 10 ? 5 : 3
  const continuityMemory = scenes
    .slice(0, memoryDepth)
    .map((s) => s.colorPalette || s.lightingMood)
    .filter(Boolean)

  return {
    phase,
    currentBeat,
    escalationLine: linePool[phase][total % linePool[phase].length],
    continuityMemory,
    actSegment: actSegmentLabel(peakIndex >= 0 ? peakIndex : 0, total),
  }
}

export function escalationPresenceForIndex(
  index: number,
  total: number
): string {
  const role = sceneArcRole(index + 1, total)
  const labels: Record<string, string[]> = {
    hook: ['Opening anticipation', 'First breath held'],
    tension: ['Rhythm rising', 'Tension gathering'],
    peak: ['Emotional crest', 'Breath held at crest'],
    release: ['Breathing beat', 'Restrained exhale'],
    aftertaste: ['Held aftertaste', 'Memory after the cut'],
  }
  const pool = labels[role] ?? ['Breathing between beats', 'Restrained cadence']
  return pool[index % pool.length]
}
