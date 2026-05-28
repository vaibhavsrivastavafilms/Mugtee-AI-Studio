/** User-facing cinematic error copy — avoids operational / pipeline wording. */
export const SOFT_ERROR_COPY = {
  storyPaused: 'Story shaping paused — your premise is saved',
  hookPaused: 'Opening beat paused — your arc is preserved',
  captionPaused: 'Caption rhythm paused — try again',
  voicePaused: 'Voice mood could not settle — try again',
  scenePaused: 'Scene beat paused — pacing preserved',
  visualPaused: 'Visual mood paused — continuity held',
  storyboardPaused: 'Storyboard frame paused — retry when ready',
  storyboardLoad: 'Visual frames paused — your pacing is preserved',
  refinementPaused: 'Refinement paused — your world is preserved',
  copyCaptions: 'Captions could not copy — try again',
  voiceFind: 'Voice could not be found — try again',
  stageFirst: 'Stage your world first — then refine storyboards',
  narrationShort: 'Script needs more breath before voice can settle',
  voiceResting: 'Voice is resting — try again shortly',
  unexpected: 'Something paused — your draft is safe',
} as const

const TECHNICAL =
  /failed|error|unexpected|required|missing|provider|queue|processing|render|invalid|timeout|quota|unauthor/i

export function softenCinematicError(
  err: unknown,
  fallback: string
): string {
  if (!(err instanceof Error)) return fallback
  const msg = err.message.trim()
  if (!msg || TECHNICAL.test(msg)) return fallback
  return msg
}
