export type V7CaptionCue = {
  startSec: number
  endSec: number
  text: string
  speaker?: string
}

function isCaptionCue(value: unknown): value is V7CaptionCue {
  if (!value || typeof value !== 'object') return false
  const cue = value as Record<string, unknown>
  return typeof cue.text === 'string' && cue.text.trim().length > 0
}

function cuesFromUnknown(value: unknown): V7CaptionCue[] {
  if (!Array.isArray(value)) return []
  return value.filter(isCaptionCue).map((cue) => ({
    startSec: Number(cue.startSec) || 0,
    endSec: Number(cue.endSec) || 0,
    text: cue.text.trim(),
    speaker: typeof cue.speaker === 'string' ? cue.speaker : undefined,
  }))
}

/** Captions live on edit output.captions or timeline.scenes[].captions. */
export function captionsFromEditStageOutput(
  output: Record<string, unknown> | null | undefined
): V7CaptionCue[] {
  if (!output) return []
  const direct = cuesFromUnknown(output.captions)
  if (direct.length > 0) return direct

  const timeline = output.timeline
  if (!timeline || typeof timeline !== 'object') return []
  const scenes = (timeline as { scenes?: unknown }).scenes
  if (!Array.isArray(scenes)) return []
  return scenes.flatMap((scene) =>
    cuesFromUnknown((scene as { captions?: unknown } | null)?.captions)
  )
}
