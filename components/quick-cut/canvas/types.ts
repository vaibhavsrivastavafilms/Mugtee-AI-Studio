export const MOOD_KEYWORDS = [
  'Cinematic',
  'Documentary',
  'Luxury',
  'Psychology',
  'Emotional',
  'Horror',
  'Atmospheric',
  'Samurai',
  'Viral Hook',
  'Dark Philosophy',
] as const

export type MoodKeyword = (typeof MOOD_KEYWORDS)[number]

export type GenerationInputMode = 'text' | 'image' | 'voice' | 'hybrid' | 'idle'

export function detectInputMode(input: {
  prompt: string
  imageNote?: string
  voiceNote?: string
  hasImage?: boolean
}): GenerationInputMode {
  const hasText = input.prompt.trim().length >= 6
  const hasImage = Boolean(input.hasImage || input.imageNote?.trim())
  const hasVoice = Boolean(input.voiceNote?.trim())

  const count = [hasText, hasImage, hasVoice].filter(Boolean).length
  if (count === 0) return 'idle'
  if (count > 1) return 'hybrid'
  if (hasImage) return 'image'
  if (hasVoice) return 'voice'
  return 'text'
}

export function buildStyleFromKeywords(keywords: string[], fallback = 'cinematic'): string {
  if (keywords.length === 0) return fallback
  return keywords.map((k) => k.toLowerCase()).join(', ')
}
