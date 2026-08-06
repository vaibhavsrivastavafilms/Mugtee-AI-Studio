import 'server-only'

/** Unified provider adapter contracts for Mugtee V7. */

export type V7ProviderKind = 'text' | 'image' | 'video' | 'voice' | 'music' | 'sound'

export type V7TextRequest = {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  projectId?: string
}

export type V7ProviderAdapter<TInput, TOutput> = {
  readonly id: string
  isConfigured(): boolean
  generate(input: TInput): Promise<TOutput>
}

export type V7TextProvider = V7ProviderAdapter<V7TextRequest, Record<string, unknown>>

export type V7ImageRequest = {
  prompt: string
  negativePrompt?: string
  aspectRatio?: string
  projectId?: string
  sceneNumber?: number
}

export type V7ImageResult = {
  url: string
  provider: string
}

export type V7ImageProvider = V7ProviderAdapter<V7ImageRequest, V7ImageResult>

export type V7VideoRequest = {
  imageUrl: string
  prompt: string
  durationSec?: number
  projectId?: string
  sceneNumber?: number
}

export type V7VideoResult = {
  url: string
  provider: string
}

export type V7VideoProvider = V7ProviderAdapter<V7VideoRequest, V7VideoResult>

export type V7VoiceRequest = {
  text: string
  voiceDirection?: string
  projectId?: string
}

export type V7VoiceResult = {
  url: string
  provider: string
}

export type V7VoiceProvider = V7ProviderAdapter<V7VoiceRequest, V7VoiceResult>
