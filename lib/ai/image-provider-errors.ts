export const IMAGE_GENERATION_UNAVAILABLE = 'IMAGE_GENERATION_UNAVAILABLE'

export const IMAGE_GENERATION_UNAVAILABLE_MESSAGE =
  'Image generation is temporarily unavailable. Our AI provider has reached current capacity. Please try again shortly.'

export class ImageGenerationUnavailableError extends Error {
  readonly code = IMAGE_GENERATION_UNAVAILABLE

  constructor(message = IMAGE_GENERATION_UNAVAILABLE_MESSAGE) {
    super(message)
    this.name = 'ImageGenerationUnavailableError'
  }
}

/** Detect Gemini/provider quota, rate limit, or temporary unavailability. */
export function isImageProviderUnavailable(status: number, sample: string): boolean {
  const s = sample.toLowerCase()
  if (status === 429) return true
  if (status >= 500) return true
  return (
    s.includes('quota') ||
    s.includes('rate limit') ||
    s.includes('exceed') ||
    s.includes('resource exhausted') ||
    s.includes('resource_exhausted') ||
    s.includes('provider unavailable') ||
    s.includes('unavailable') ||
    s.includes('overloaded') ||
    s.includes('capacity')
  )
}
