import type { CinematicNiche } from '@/lib/cinematic/niches'
import type { GeneratedScene } from '@/lib/cinematic/generation'

export type RhythmAnalysis = {
  targetDuration: number
  assignedDuration: number
  beatSpacing: 'tight' | 'balanced' | 'breathing'
  escalationScore: number
  issues: string[]
}

const ROLE_WEIGHT: Record<string, number> = {
  hook: 0,
  tension: 1,
  peak: 2,
  release: 3,
  aftertaste: 4,
}

export function analyzeCinematicRhythm(
  scenes: GeneratedScene[],
  targetDuration: number,
  roles: string[]
): RhythmAnalysis {
  const assignedDuration = scenes.reduce((sum, s) => sum + s.duration, 0)
  const issues: string[] = []
  const delta = Math.abs(assignedDuration - targetDuration)

  if (delta > Math.max(4, targetDuration * 0.2)) {
    issues.push('duration_drift')
  }
  if (scenes.length >= 3) {
    const mid = scenes.slice(1, -1)
    const avgMid = mid.reduce((s, sc) => s + sc.duration, 0) / mid.length
    const first = scenes[0]?.duration ?? 0
    const last = scenes[scenes.length - 1]?.duration ?? 0
    if (avgMid <= first * 0.85) issues.push('flat_middle')
    if (last > first * 1.4) issues.push('rushed_open')
  }

  let escalationScore = 0
  roles.forEach((role, i) => {
    escalationScore += ROLE_WEIGHT[role] ?? i
  })
  escalationScore = escalationScore / Math.max(roles.length, 1)

  const beatSpacing =
    assignedDuration / Math.max(scenes.length, 1) <= 4
      ? 'tight'
      : assignedDuration / Math.max(scenes.length, 1) >= 7
        ? 'breathing'
        : 'balanced'

  return {
    targetDuration,
    assignedDuration,
    beatSpacing,
    escalationScore,
    issues,
  }
}

/** Redistribute scene durations to match target while preserving arc weighting. */
export function rebalanceSceneDurations(
  scenes: GeneratedScene[],
  targetDuration: number,
  roles: string[]
): GeneratedScene[] {
  if (!scenes.length) return scenes

  const weights = roles.map((role, i) => {
    const base = ROLE_WEIGHT[role] ?? i
    return 1 + base * 0.15
  })
  const weightSum = weights.reduce((a, b) => a + b, 0) || 1

  return scenes.map((scene, i) => {
    const share = (weights[i] ?? 1) / weightSum
    const raw = Math.round(targetDuration * share)
    const duration = Math.min(8, Math.max(2, raw))
    return { ...scene, duration }
  })
}

export function formatDirectedScript(
  hook: string,
  beats: Array<{ title: string; description: string }>
): string {
  const lines: string[] = []
  if (hook.trim()) {
    lines.push(hook.replace(/^"|"$/g, '').trim())
    lines.push('')
  }
  beats.forEach((beat, i) => {
    lines.push(`[${i + 1}] ${beat.title}`)
    lines.push(beat.description.trim())
    lines.push('')
  })
  return lines.join('\n').trim()
}
