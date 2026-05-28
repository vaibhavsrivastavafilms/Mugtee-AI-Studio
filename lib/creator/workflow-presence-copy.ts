export type WorkflowPresencePhase =
  | 'generating'
  | 'refining'
  | 'regenerating'
  | 'exporting'
  | 'restoring'

const PHASE_LINES: Record<WorkflowPresencePhase, readonly string[]> = {
  generating: [
    'Preserving your pacing rhythm…',
    'Shaping emotional cadence from your premise…',
    'Aligning screenplay beats to your arc…',
  ],
  refining: [
    'Preserving your pacing rhythm…',
    'Aligning visual continuity…',
    'Scene rhythm remains intact…',
  ],
  regenerating: [
    'Narrative continuity maintained…',
    'Your pacing structure is preserved…',
    'Refining without disrupting your arc…',
  ],
  exporting: [
    'Your world is becoming film…',
    'Holding hook, pacing, and frames in rhythm…',
    'Letting the sequence settle into form…',
  ],
  restoring: [
    'Your film world is waking back up…',
    'Atmosphere returning — the story still lives here…',
    'Directing rhythm intact — re-entering your world…',
  ],
}

export function getWorkflowPresenceLine(
  phase: WorkflowPresencePhase,
  seed = 0
): string {
  const pool = PHASE_LINES[phase]
  return pool[seed % pool.length]
}

export const COMPLETION_ACHIEVEMENT_LINES = [
  'Your film world rests in enduring rhythm',
  'Hook, pacing, and frames held in time',
  'Your directed world reached its form',
] as const

export function getCompletionAchievementLine(seed = 0): string {
  return COMPLETION_ACHIEVEMENT_LINES[seed % COMPLETION_ACHIEVEMENT_LINES.length]
}

export const EXPORT_CONTINUITY_LINES = [
  'Opening beat aligned with your hook',
  'Pacing continuity confirmed across scenes',
  'Storyboard rhythm carried into the world',
] as const

export function getExportContinuityLine(seed = 0): string {
  return EXPORT_CONTINUITY_LINES[seed % EXPORT_CONTINUITY_LINES.length]
}

export const EXPORT_PACING_REASSURANCE = [
  'Your emotional pacing remains cohesive.',
  'Visual rhythm finalized for cinematic delivery.',
  'Directed sequence emotionally complete.',
] as const

export function getExportPacingPresenceLine(seed = 0): string {
  return EXPORT_PACING_REASSURANCE[seed % EXPORT_PACING_REASSURANCE.length]
}
