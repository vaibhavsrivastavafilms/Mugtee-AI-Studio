import 'server-only'

const STEP_LABELS = [
  'Validate Assets',
  'Build Timeline',
  'Prepare Scene Media',
  'Merge Audio',
  'Render MP4',
  'Save Output',
] as const

export type Mp4RenderStep = 1 | 2 | 3 | 4 | 5 | 6

export function mp4RenderLog(
  step: Mp4RenderStep,
  message: string,
  payload?: Record<string, unknown>
): void {
  const label = STEP_LABELS[step - 1]
  const line = `[MP4_RENDER] Step ${step}: ${label} — ${message}`
  if (payload && Object.keys(payload).length > 0) {
    console.info(line, payload)
  } else {
    console.info(line)
  }
}
