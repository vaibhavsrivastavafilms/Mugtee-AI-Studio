/**
 * Canonical cinematic script data model.
 * Pipeline: Hook → Narration Beats → Payoff → CTA → Storyboard → Voice → Video
 */

export type ScriptBeat = {
  narration: string
  duration: string
  emotion: string
}

export type CinematicScript = {
  hook: string
  scriptBeats: ScriptBeat[]
  payoff: string
  cta: string
}

/** Persisted jsonb shape on cinematic_projects.script_beats */
export type ScriptBeatsPayload = {
  beats: ScriptBeat[]
  payoff?: string
  cta?: string
}
