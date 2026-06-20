import { creatorFriendlyMessage } from '@/lib/errors/creator-friendly-errors'
import { SOFT_ERROR_COPY, softenCinematicError } from '@/lib/creator/soft-error-copy'
import { PlanLimitError } from '@/lib/cinematic/generation-pipeline-fetch'
import { PLAN_LIMIT_MESSAGE } from '@/lib/usage/usage-tracker'
import {
  IMAGE_GENERATION_UNAVAILABLE_MESSAGE,
  ImageGenerationUnavailableError,
} from '@/lib/ai/image-provider-errors'
import {
  ProviderFailureError,
  PROVIDER_UNAVAILABLE_HEADLINE,
} from '@/lib/ai/providers/provider-diagnostics.client'

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
  IMAGE_GENERATION_UNAVAILABLE_MESSAGE,
])

/** Never surface provider/JSON/stack details in the UI. */
export function toUserGenerationError(err: unknown): string {
  if (err instanceof ProviderFailureError) {
    return PROVIDER_UNAVAILABLE_HEADLINE
  }
  if (err instanceof ImageGenerationUnavailableError) {
    return err.message || IMAGE_GENERATION_UNAVAILABLE_MESSAGE
  }
  if (err instanceof PlanLimitError) {
    return err.message || PLAN_LIMIT_MESSAGE
  }
  if (err instanceof Error) {
    const msg = err.message.trim()
    if (RAW_USER_MESSAGES.has(msg)) {
      return SOFT_ERROR_COPY.storyPaused
    }
    const softened = softenCinematicError(err, SOFT_ERROR_COPY.storyPaused)
    if (softened === SOFT_ERROR_COPY.storyPaused) {
      return creatorFriendlyMessage(err, 'generation')
    }
    return softened
  }
  return creatorFriendlyMessage(err, 'generation')
}

export const GENERATION_RECOVERY_MESSAGE =
  'Your previous outputs are safe. We can retry only the step that was interrupted.'
