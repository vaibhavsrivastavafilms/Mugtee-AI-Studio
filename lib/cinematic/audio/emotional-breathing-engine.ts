import { scenePacingRole } from '@/lib/cinematic/regen-context'

export type BreathingCadence = {
  pauseBeforeMs: number
  pauseAfterMs: number
  breathLabel: string
  wpmModifier: number
}

export function breathingCadenceForRole(role: string): BreathingCadence {
  const map: Record<string, BreathingCadence> = {
    hook: {
      pauseBeforeMs: 180,
      pauseAfterMs: 320,
      breathLabel: 'held inhale before the hook lands',
      wpmModifier: 0.92,
    },
    tension: {
      pauseBeforeMs: 120,
      pauseAfterMs: 200,
      breathLabel: 'short breath — urgency without rush',
      wpmModifier: 1.02,
    },
    peak: {
      pauseBeforeMs: 280,
      pauseAfterMs: 420,
      breathLabel: 'long exhale into emotional crest',
      wpmModifier: 0.88,
    },
    release: {
      pauseBeforeMs: 160,
      pauseAfterMs: 280,
      breathLabel: 'documentary breath — space to feel',
      wpmModifier: 0.95,
    },
    aftertaste: {
      pauseBeforeMs: 340,
      pauseAfterMs: 520,
      breathLabel: 'stillness — let the line linger',
      wpmModifier: 0.82,
    },
  }
  return (
    map[role] ?? {
      pauseBeforeMs: 150,
      pauseAfterMs: 250,
      breathLabel: 'natural cinematic cadence',
      wpmModifier: 1,
    }
  )
}

export function breathingCadenceForScene(
  sceneIndex: number,
  totalScenes: number
): BreathingCadence {
  const role = scenePacingRole(sceneIndex, totalScenes || 1)
  const base = breathingCadenceForRole(role)
  const variant = sceneIndex % 2
  if (variant === 1 && role === 'tension') {
    return {
      ...base,
      pauseBeforeMs: base.pauseBeforeMs + 40,
      breathLabel: 'measured urgency — consonants stay soft',
    }
  }
  if (variant === 1 && role === 'peak') {
    return {
      ...base,
      pauseAfterMs: base.pauseAfterMs + 60,
      breathLabel: 'long vowel hold — performed, not read',
    }
  }
  return base
}

export function adjustWpmForBreathing(baseWpm: number, cadence: BreathingCadence): number {
  return Math.round(baseWpm * cadence.wpmModifier)
}
