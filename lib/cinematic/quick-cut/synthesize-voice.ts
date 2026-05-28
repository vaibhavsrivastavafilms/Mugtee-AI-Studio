import { synthesizeSpeechBuffer } from '@/lib/ai/synthesize-speech'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const BUCKET = 'project-assets'

export type VoiceSynthesisResult = {
  audioUrl: string | null
  waveform: number[]
  provider: string
  mock: boolean
}

export async function synthesizeQuickCutVoice(
  script: string,
  userId?: string
): Promise<VoiceSynthesisResult> {
  const waveform = Array.from({ length: 24 }, (_, i) => {
    const base = 0.25 + Math.sin(i * 0.55) * 0.2
    return Math.min(0.95, Math.max(0.12, base + (i % 5 === 0 ? 0.35 : 0)))
  })

  const { buffer, provider } = await synthesizeSpeechBuffer(script)
  if (!buffer) {
    return { audioUrl: null, waveform, provider: 'none', mock: true }
  }

  if (userId) {
    const supabase = createSupabaseServerClient()
    const filename = `${userId}/faceless/voice_${Date.now()}.mp3`
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, { contentType: 'audio/mpeg', upsert: false })
    if (!upErr) {
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filename)
      return { audioUrl: pub.publicUrl, waveform, provider, mock: false }
    }
  }

  return {
    audioUrl: `data:audio/mpeg;base64,${buffer.toString('base64')}`,
    waveform,
    provider,
    mock: false,
  }
}
