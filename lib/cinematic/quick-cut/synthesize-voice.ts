import { generateVoice } from '@/lib/voice/generateVoice'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type VoiceSynthesisResult = {
  audioUrl: string | null
  waveform: number[]
  provider: string
  mock: boolean
  voiceMetadata?: import('@/lib/voice/generateVoice').VoiceMetadata | null
}

export async function synthesizeQuickCutVoice(
  script: string,
  userId?: string,
  options?: {
    niche?: string
    tone?: string
    elevenLabsVoiceId?: string
    voiceName?: string
  }
): Promise<VoiceSynthesisResult> {
  const supabase = userId ? createSupabaseServerClient() : undefined
  const result = await generateVoice(
    {
      script,
      userId,
      niche: options?.niche,
      tone: options?.tone,
      elevenLabsVoiceId: options?.elevenLabsVoiceId,
      voiceName: options?.voiceName,
    },
    supabase
  )

  return {
    audioUrl: result.audioUrl,
    waveform: result.waveform,
    provider: result.provider,
    mock: result.mock || !result.audioUrl,
    voiceMetadata: result.voiceMetadata,
  }
}
