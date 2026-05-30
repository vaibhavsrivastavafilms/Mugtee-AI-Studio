import { SOFT_ERROR_COPY, softenCinematicError } from '@/lib/creator/soft-error-copy'

const RAW_USER_MESSAGES = new Set([
  SOFT_ERROR_COPY.storyPaused,
  'Story shaping paused — try again',
  'Scene generation paused',
  'Image generation paused',
  'Voice generation paused',
  'Title generation failed',
  'Script generation failed',
  'Scene generation failed',
  'Generation paused — try again.',
  'Connection lost — your work is saved. Try again.',
  'This step took too long — your work is saved. Try again.',
])

/** Never surface provider/JSON/stack details in the UI. */
export function toUserGenerationError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.trim()
    if (RAW_USER_MESSAGES.has(msg)) {
      return SOFT_ERROR_COPY.storyPaused
    }
    return softenCinematicError(err, SOFT_ERROR_COPY.storyPaused)
  }
  return SOFT_ERROR_COPY.storyPaused
}

export const GENERATION_RECOVERY_MESSAGE =
  "Your project is safe. We couldn't complete the next step — you can continue from where we left off."
