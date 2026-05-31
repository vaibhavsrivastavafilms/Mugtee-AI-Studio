'use client'

import { toast } from 'sonner'
import {
  IMAGE_GENERATION_UNAVAILABLE,
  IMAGE_GENERATION_UNAVAILABLE_MESSAGE,
} from '@/lib/ai/image-provider-errors'

export function isImageGenerationUnavailablePayload(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  return (data as { error?: string }).error === IMAGE_GENERATION_UNAVAILABLE
}

export function showImageGenerationUnavailableToast(message?: string) {
  toast.error(message?.trim() || IMAGE_GENERATION_UNAVAILABLE_MESSAGE)
}

/** Plan-limit responses are handled separately — returns false for those. */
export function handleImageGenerationUnavailableResponse(
  res: Response,
  data: unknown
): boolean {
  if (!isImageGenerationUnavailablePayload(data)) return false
  const message =
    typeof (data as { message?: string }).message === 'string'
      ? (data as { message: string }).message
      : IMAGE_GENERATION_UNAVAILABLE_MESSAGE
  showImageGenerationUnavailableToast(message)
  return true
}
