import type { CinematicNiche } from '@/lib/cinematic/niches'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { sceneArcRole } from '@/lib/cinematic/regen-context'

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

  if (scenes.length >= 10) {
    const arcRoles = scenes.map((_, i) => sceneArcRole(i + 1, scenes.length))
    const releaseCount = arcRoles.filter((r) => r === 'release').length
    if (releaseCount < 2) issues.push('rhythm_collapse')
    const peakCount = arcRoles.filter((r) => r === 'peak').length
    if (peakCount === 0) issues.push('repetitive_arc')
    const midRoles = arcRoles.slice(2, -2)
    const tensionRatio = midRoles.filter((r) => r === 'tension').length / Math.max(midRoles.length, 1)
    if (tensionRatio > 0.85) issues.push('emotional_flattening')
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

/** Inject breathing beats into long sequences when arc rhythm collapses. */
export function correctLongFormRhythm(
  scenes: GeneratedScene[],
  targetDuration: number
): GeneratedScene[] {
  if (scenes.length < 10) return scenes
  const roles = scenes.map((_, i) => sceneArcRole(i + 1, scenes.length))
  const releaseCount = roles.filter((r) => r === 'release').length
  if (releaseCount >= 2) return scenes

  return scenes.map((scene, i) => {
    if (i === 0 || i === scenes.length - 1) return scene
    if (i % 5 !== 0) return scene
    const dur = scene.duration ?? targetDuration / scenes.length
    return { ...scene, duration: Math.max(2, Math.round(dur * 1.06 * 10) / 10) }
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
