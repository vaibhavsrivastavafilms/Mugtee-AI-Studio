import type { CinematicProjectStatus } from '@/stores/cinematic-project'

const STAGE_RETURN: Partial<Record<string, string[]>> = {
  create: ['Your film world awaits a new premise', 'The directing environment is open'],
  preview: ['Your screenplay world still breathes', 'Return to the sequence you shaped'],
  director: ['Your mood world is still alive', 'Re-enter the atmosphere you were directing'],
  scenes: ['Your visual story-world waits', 'Storyboard rhythm held in place'],
  voiceover: ['Voice arc held in your film world', 'Narration rhythm still present'],
  compile: ['Your film world nears final form', 'The showcase sequence awaits'],
}

const NIGHT_RETURN = [
  'Your cinematic world still lives here',
  'Return to the atmosphere you were shaping',
]

const MORNING_RETURN = [
  'Your film world is waking with you',
  'Re-enter where your directed arc left off',
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
