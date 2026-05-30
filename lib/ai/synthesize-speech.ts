import {
  describeElevenLabsApiError,
  getDefaultElevenLabsModelId,
  synthesizeElevenLabsSpeech,
} from '@/lib/ai/elevenlabs'
import {
  allowElevenLabsVoice,
  allowEmergentTts,
  allowOpenAITts,
  FREE_OPENAI_TTS_MODEL,
} from '@/lib/ai/free-tier'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import { trimNarrationForMaxDuration } from '@/lib/cinematic/scene-duration'
import { logError } from '@/lib/workspace/validation'

const EMERGENT_LLM_KEY = process.env.EMERGENT_LLM_KEY
const TTS_URL = 'https://integrations.emergentagent.com/llm/v1/audio/speech'

export function buildNarrationFromScript(script: string): string {
  return trimNarrationForMaxDuration(
    script
      .replace(/Scene\s+\d+[^\n]*/gi, '')
      .replace(/Visual:[^\n]*/gi, '')
      .replace(/\[0:\d+[^\]]*\]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  )
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

async function synthesizeElevenLabsTts(
  text: string,
  elevenLabsVoiceId?: string
): Promise<{ buffer: Buffer | null; apiStatus?: number }> {
  if (!allowElevenLabsVoice() || !text.trim()) return { buffer: null }
  const result = await synthesizeElevenLabsSpeech(text, {
    voiceId: elevenLabsVoiceId,
    modelId: getDefaultElevenLabsModelId(),
  })
  return result
}

export type SpeechSynthesisResult = {
  buffer: Buffer | null
  provider: 'elevenlabs' | 'openai_tts' | 'emergent_tts' | 'none'
  voiceName?: string
  fallbackMessage?: string
}

export type SpeechSynthesisOptions = {
  elevenLabsVoiceId?: string
  voiceName?: string
}

/** Free tier: OpenAI TTS only. Paid: ElevenLabs → OpenAI → Emergent. */
export async function synthesizeSpeechBuffer(
  text: string,
  options?: SpeechSynthesisOptions
): Promise<SpeechSynthesisResult> {
  const narration = buildNarrationFromScript(text)
  if (!narration || narration.length < 12) {
    return { buffer: null, provider: 'none' }
  }

  const triedEleven = allowElevenLabsVoice()
  let elevenApiStatus: number | undefined
  if (triedEleven) {
    const eleven = await synthesizeElevenLabsTts(narration, options?.elevenLabsVoiceId)
    elevenApiStatus = eleven.apiStatus
    if (eleven.buffer) {
      return {
        buffer: eleven.buffer,
        provider: 'elevenlabs',
        voiceName: options?.voiceName,
      }
    }
  }

  const openai = await synthesizeOpenAITts(narration)
  if (openai) {
    return {
      buffer: openai,
      provider: 'openai_tts',
      voiceName: options?.voiceName || 'OpenAI Narrator',
      fallbackMessage: triedEleven
        ? describeElevenLabsApiError(elevenApiStatus)
        : 'Using OpenAI voice — add ELEVENLABS_API_KEY for ElevenLabs.',
    }
  }

  if (allowEmergentTts()) {
    const emergent = await synthesizeEmergentTts(narration)
    if (emergent) {
      return {
        buffer: emergent,
        provider: 'emergent_tts',
        voiceName: options?.voiceName || 'Emergent Narrator',
        fallbackMessage: 'Using Emergent TTS fallback.',
      }
    }
  }

  return {
    buffer: null,
    provider: 'none',
    fallbackMessage:
      'No voice API configured. Set ELEVENLABS_API_KEY or OPENAI_API_KEY in .env.local.',
  }
}
