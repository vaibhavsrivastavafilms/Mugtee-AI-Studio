import {
  allowElevenLabsVoice,
  allowEmergentTts,
  allowOpenAITts,
  FREE_OPENAI_TTS_MODEL,
} from '@/lib/ai/free-tier'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import { logError } from '@/lib/workspace/validation'

const EMERGENT_LLM_KEY = process.env.EMERGENT_LLM_KEY
const TTS_URL = 'https://integrations.emergentagent.com/llm/v1/audio/speech'

export function buildNarrationFromScript(script: string): string {
  return script
    .replace(/Scene\s+\d+[^\n]*/gi, '')
    .replace(/Visual:[^\n]*/gi, '')
    .replace(/\[0:\d+[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000)
}

async function synthesizeOpenAITts(text: string): Promise<Buffer | null> {
  if (!allowOpenAITts() || !text.trim()) return null
  try {
    const openai = getOpenAIClient()
    const res = await openai.audio.speech.create({
      model: FREE_OPENAI_TTS_MODEL,
      voice: 'onyx',
      input: text.slice(0, 4000),
    })
    return Buffer.from(await res.arrayBuffer())
  } catch (err) {
    logError('synthesize-speech.openai', err)
    return null
  }
}

async function synthesizeEmergentTts(text: string): Promise<Buffer | null> {
  if (!allowEmergentTts() || !text.trim()) return null
  try {
    const res = await fetch(TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${EMERGENT_LLM_KEY}`,
      },
      body: JSON.stringify({
        model: FREE_OPENAI_TTS_MODEL,
        voice: 'onyx',
        input: text.slice(0, 4000),
        response_format: 'mp3',
      }),
    })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch (err) {
    logError('synthesize-speech.emergent', err)
    return null
  }
}

async function synthesizeElevenLabsTts(text: string): Promise<Buffer | null> {
  const key = process.env.ELEVENLABS_API_KEY?.trim()
  if (!allowElevenLabsVoice() || !key || !text.trim()) return null

  const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5'

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch (err) {
    logError('synthesize-speech.elevenlabs', err)
    return null
  }
}

export type SpeechSynthesisResult = {
  buffer: Buffer | null
  provider: 'elevenlabs' | 'openai_tts' | 'emergent_tts' | 'none'
}

/** Free tier: OpenAI TTS only. Paid: ElevenLabs → OpenAI → Emergent. */
export async function synthesizeSpeechBuffer(text: string): Promise<SpeechSynthesisResult> {
  const narration = buildNarrationFromScript(text)
  if (!narration || narration.length < 12) {
    return { buffer: null, provider: 'none' }
  }

  if (allowElevenLabsVoice()) {
    const eleven = await synthesizeElevenLabsTts(narration)
    if (eleven) return { buffer: eleven, provider: 'elevenlabs' }
  }

  const openai = await synthesizeOpenAITts(narration)
  if (openai) return { buffer: openai, provider: 'openai_tts' }

  if (allowEmergentTts()) {
    const emergent = await synthesizeEmergentTts(narration)
    if (emergent) return { buffer: emergent, provider: 'emergent_tts' }
  }

  return { buffer: null, provider: 'none' }
}
