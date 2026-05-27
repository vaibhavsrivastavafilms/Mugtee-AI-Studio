import type { CinematicProjectStatus } from '@/stores/cinematic-project'

const STAGE_RETURN: Partial<Record<string, string[]>> = {
  create: ['Continue shaping your story', 'Your cinematic draft awaits'],
  preview: ['Your cinematic draft awaits', 'Continue shaping your story'],
  director: ['Resume visual direction', 'Continue shaping your story'],
  scenes: ['Resume visual direction', 'Your storyboard awaits'],
  voiceover: ['Your cinematic draft awaits', 'Continue shaping your story'],
  compile: ['Your export package awaits', 'Continue shaping your story'],
}

const NIGHT_RETURN = [
  'Your cinematic draft awaits',
  'Return to the story you were directing',
]

const MORNING_RETURN = [
  'Continue shaping your story',
  'Pick up where your arc left off',
]

export function getReturnEnergyLine(
  stage: CinematicProjectStatus | string,
  seed = 0
): string {
  const hour = new Date().getHours()
  const timePool =
    hour >= 6 && hour < 12
      ? MORNING_RETURN
      : hour >= 20 || hour < 6
        ? NIGHT_RETURN
        : null

  const stagePool = STAGE_RETURN[stage] ?? STAGE_RETURN.create!
  const pool = timePool ? [...stagePool, ...timePool] : stagePool
  return pool[seed % pool.length]
}

export const DIRECTOR_TRUST_LINES = [
  'Your pacing structure is preserved.',
  'Scene rhythm remains intact.',
  'Narrative continuity maintained.',
] as const

export function getDirectorTrustLine(seed = 0): string {
  return DIRECTOR_TRUST_LINES[seed % DIRECTOR_TRUST_LINES.length]
}
