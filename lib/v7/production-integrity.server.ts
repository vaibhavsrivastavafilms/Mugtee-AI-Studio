import 'server-only'

/** Providers that produce slideshow/Ken Burns motion — not acceptable production scene video. */
const SLIDESHOW_VIDEO_PROVIDER_IDS = new Set([
  'image-animation',
  'ffmpeg-ken-burns',
  'checkpoint-recovery',
])

export function allowSlideshowVideoFallback(): boolean {
  return process.env.V7_ALLOW_IMAGE_ANIMATION === 'true'
}

export function allowMockRender(): boolean {
  return (
    process.env.VIDEO_RENDER_MOCK === 'true' && process.env.V7_ALLOW_MOCK_RENDER === 'true'
  )
}

export function allowSilentVoiceFallback(): boolean {
  return process.env.V7_ALLOW_SILENT_VOICE === 'true'
}

export function isSlideshowOrFallbackVideo(params: {
  provider?: string | null
  fallback?: boolean
  videoUrl?: string | null
  imageUrl?: string | null
}): boolean {
  const provider = params.provider?.trim().toLowerCase()
  if (params.fallback === true) return true
  if (provider && SLIDESHOW_VIDEO_PROVIDER_IDS.has(provider)) return true
  if (
    params.videoUrl?.trim() &&
    params.imageUrl?.trim() &&
    params.videoUrl.trim() === params.imageUrl.trim()
  ) {
    return true
  }
  return false
}

export function slideshowVideoBlockerMessage(sceneLabel: string): string {
  return `${sceneLabel} uses Ken Burns/image-animation — real AI scene video is required (configure WAN_VIDEO_URL or another V7 video provider)`
}

export function assertProductionRenderAllowed(): void {
  if (process.env.VIDEO_RENDER_MOCK === 'true' && !allowMockRender()) {
    throw new Error(
      'VIDEO_RENDER_MOCK is set but mock renders are disabled. Remove VIDEO_RENDER_MOCK or set V7_ALLOW_MOCK_RENDER=true for local dev only.'
    )
  }
}

export function assertRealVoiceRequired(params: {
  voiceUrl: string | null | undefined
  provider?: string | null
  narrationLength: number
}): void {
  if (allowSilentVoiceFallback()) return
  if (!params.narrationLength) return
  if (params.provider === 'silent') {
    throw new Error(
      'Voice generation failed — silent voice fallback is disabled. Configure ElevenLabs, Kokoro, or another TTS provider.'
    )
  }
  if (!params.voiceUrl?.trim()) {
    throw new Error(
      'Voiceover missing — production requires studio AI narration. Configure a TTS provider or set V7_ALLOW_SILENT_VOICE=true for dev only.'
    )
  }
}
